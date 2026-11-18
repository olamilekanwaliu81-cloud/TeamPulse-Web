// TeamPulse for Mac: opens the live TeamPulse site in a native window of its own.
// Build with macos/build_mac.sh. Run with --selftest to check the live site loads inside the app, without showing a window.
//
// It is the same app and the same data as on the website and on phones. It needs an internet connection.
// The address comes from the build (TP_URL_STR). Only pages on that address open inside the app;
// every other link opens in the default browser.

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate>
@property (strong) NSWindow *window;
@property (strong) WKWebView *webView;
@property (assign) BOOL selfTestMode;
@property (assign) BOOL testStarted;
@property (strong) NSURL *retriedURL; // the page we already quietly retried once after a stall
@end

@implementation AppDelegate

#ifndef TP_URL_STR
#define TP_URL_STR "https://teampulse.owpublishiing.com"
#endif

- (NSURL *)siteURL { return [NSURL URLWithString:@TP_URL_STR]; }
- (NSURL *)pageURL:(NSString *)path { return [NSURL URLWithString:path relativeToURL:[self siteURL]]; }

- (void)loadPath:(NSString *)path {
    NSURLRequest *req = [NSURLRequest requestWithURL:[self pageURL:path] cachePolicy:NSURLRequestReloadRevalidatingCacheData timeoutInterval:60];
    [self.webView loadRequest:req];
}
- (void)loadHome { [self loadPath:@"/"]; }

#pragma mark - Launch

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    self.selfTestMode = [[[NSProcessInfo processInfo] arguments] containsObject:@"--selftest"];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    // The self-test works in throwaway storage, so it can never touch the data of a real user.
    if (self.selfTestMode) { config.websiteDataStore = [WKWebsiteDataStore nonPersistentDataStore]; }
    // Tells the page it is running inside the desktop app, so it hides its own download buttons.
    WKUserScript *flag = [[WKUserScript alloc] initWithSource:@"window.TP_DESKTOP='mac';" injectionTime:WKUserScriptInjectionTimeAtDocumentStart forMainFrameOnly:NO];
    [config.userContentController addUserScript:flag];
    self.webView = [[WKWebView alloc] initWithFrame:NSMakeRect(0, 0, 1280, 860) configuration:config];
    self.webView.navigationDelegate = self;
    self.webView.UIDelegate = self;
    self.webView.allowsBackForwardNavigationGestures = YES;

    NSWindowStyleMask style = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable;
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 1280, 860) styleMask:style backing:NSBackingStoreBuffered defer:NO];
    self.window.title = @"TeamPulse";
    self.window.minSize = NSMakeSize(380, 560);
    self.window.contentView = self.webView;
    self.window.delegate = self;
    self.window.releasedWhenClosed = NO;

    if (self.selfTestMode) {
        // Keep the window out of sight and run the checks once the page has loaded.
        [self.window setFrameOrigin:NSMakePoint(-6000, -6000)];
        [self.window orderFrontRegardless];
        [self loadHome];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(40 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
            printf("FAIL: self-test timed out\n");
            exit(2);
        });
        return;
    }

    [self buildMenu];
    [self.window setFrameAutosaveName:@"TeamPulseMainWindow"];
    if (![self.window setFrameUsingName:@"TeamPulseMainWindow"]) { [self.window center]; }
    [self loadHome];
    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender { return YES; }
- (BOOL)applicationSupportsSecureRestorableState:(NSApplication *)app { return YES; }

#pragma mark - Only TeamPulse pages open inside the app. Everything else opens in the browser.

- (void)webView:(WKWebView *)webView decidePolicyForNavigationAction:(WKNavigationAction *)action decisionHandler:(void (^)(WKNavigationActionPolicy))handler {
    if (@available(macOS 11.3, *)) {
        if (action.shouldPerformDownload) { handler(WKNavigationActionPolicyDownload); return; }
    }
    NSURL *url = action.request.URL;
    NSString *scheme = url.scheme.lowercaseString;
    if ([scheme isEqualToString:@"tp-retry"]) {
        // "Try again" reloads the page that failed (kept in the link), not the start page. Only pages of our own site are allowed.
        NSURLComponents *c = [NSURLComponents componentsWithURL:url resolvingAgainstBaseURL:NO];
        NSString *wanted = nil;
        for (NSURLQueryItem *q in c.queryItems) { if ([q.name isEqualToString:@"u"]) { wanted = q.value; } }
        NSURL *target = wanted.length ? [NSURL URLWithString:wanted] : nil;
        if (target && [target.host.lowercaseString isEqualToString:[self siteURL].host.lowercaseString] && [target.scheme.lowercaseString isEqualToString:@"https"]) {
            [self.webView loadRequest:[NSURLRequest requestWithURL:target cachePolicy:NSURLRequestReloadRevalidatingCacheData timeoutInterval:60]];
        } else { [self loadHome]; }
        handler(WKNavigationActionPolicyCancel); return;
    }
    if ([scheme isEqualToString:@"http"] || [scheme isEqualToString:@"https"]) {
        BOOL ours = [url.host.lowercaseString isEqualToString:[self siteURL].host.lowercaseString];
        if (!ours) {
            [[NSWorkspace sharedWorkspace] openURL:url];
            handler(WKNavigationActionPolicyCancel);
            return;
        }
    } else if ([@[@"mailto", @"tel"] containsObject:scheme]) {
        [[NSWorkspace sharedWorkspace] openURL:url];
        handler(WKNavigationActionPolicyCancel);
        return;
    }
    handler(WKNavigationActionPolicyAllow); // our own pages, blob: and about:
}

#pragma mark - Saving files (for example the network tree picture)

- (void)webView:(WKWebView *)webView navigationAction:(WKNavigationAction *)navigationAction didBecomeDownload:(WKDownload *)download API_AVAILABLE(macos(11.3)) {
    download.delegate = self;
}

- (void)webView:(WKWebView *)webView navigationResponse:(WKNavigationResponse *)navigationResponse didBecomeDownload:(WKDownload *)download API_AVAILABLE(macos(11.3)) {
    download.delegate = self;
}

- (void)download:(WKDownload *)download decideDestinationUsingResponse:(NSURLResponse *)response suggestedFilename:(NSString *)suggestedFilename completionHandler:(void (^)(NSURL *destination))completionHandler API_AVAILABLE(macos(11.3)) {
    NSSavePanel *panel = [NSSavePanel savePanel];
    panel.nameFieldStringValue = suggestedFilename ?: @"TeamPulse file";
    panel.directoryURL = [NSURL fileURLWithPath:[NSSearchPathForDirectoriesInDomains(NSDownloadsDirectory, NSUserDomainMask, YES) firstObject] ?: NSHomeDirectory()];
    [panel beginSheetModalForWindow:self.window completionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK && panel.URL) {
            [[NSFileManager defaultManager] removeItemAtURL:panel.URL error:nil];
            completionHandler(panel.URL);
        } else {
            completionHandler(nil);
        }
    }];
}

- (WKWebView *)webView:(WKWebView *)webView createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration forNavigationAction:(WKNavigationAction *)action windowFeatures:(WKWindowFeatures *)features {
    if (action.request.URL) { [[NSWorkspace sharedWorkspace] openURL:action.request.URL]; }
    return nil;
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    self.retriedURL = nil;
    if (self.selfTestMode) { [self runSelfTest]; }
}

/// A page that stalled or dropped is tried once more by itself. Only if that fails too do we show the message.
- (BOOL)retryOnce:(NSError *)error {
    NSURL *failed = error.userInfo[NSURLErrorFailingURLErrorKey];
    BOOL stall = error.code == NSURLErrorTimedOut || error.code == NSURLErrorNetworkConnectionLost;
    if (!stall || !failed || [failed isEqual:self.retriedURL]) { return NO; }
    self.retriedURL = failed;
    [self.webView loadRequest:[NSURLRequest requestWithURL:failed cachePolicy:NSURLRequestReloadRevalidatingCacheData timeoutInterval:60]];
    return YES;
}

- (void)showOffline:(NSError *)error {
    if (error.code == NSURLErrorCancelled) { return; }
    if ([self retryOnce:error]) { return; }
    NSURL *failed = error.userInfo[NSURLErrorFailingURLErrorKey];
    BOOL slow = error.code == NSURLErrorTimedOut || error.code == NSURLErrorNetworkConnectionLost;
    BOOL offline = error.code == NSURLErrorNotConnectedToInternet || error.code == NSURLErrorCannotFindHost || error.code == NSURLErrorDNSLookupFailed;
    NSString *title = slow ? @"TeamPulse took too long" : @"TeamPulse cannot connect";
    NSString *body = slow ? @"The site did not answer in time. Your internet may be slow, or the site is waking up. Your data is safe on the team's site."
                  : offline ? @"Check that this computer is online, then try again. Your data is safe on the team's site."
                  : @"The page did not load. Try again in a moment. Your data is safe on the team's site.";
    NSString *enc = failed.absoluteString ? [failed.absoluteString stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]] : @"";
    NSString *html = [NSString stringWithFormat:@"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>"
        "<style>body{margin:0;font:16px -apple-system,sans-serif;background:#F4F7FE;color:#0F1B44;display:grid;place-items:center;height:100vh}"
        ".c{max-width:420px;text-align:center;padding:24px}h1{font-size:1.5rem;margin:0 0 8px}p{color:#6B7799;margin:0 0 20px}"
        "a{display:inline-block;background:#2F62F5;color:#fff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:12px}</style>"
        "<div class=c><h1>%@</h1><p>%@</p><a href='tp-retry://now?u=%@'>Try again</a></div>", title, body, enc];
    self.retriedURL = nil;
    [self.webView loadHTMLString:html baseURL:nil];
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    if (self.selfTestMode) { printf("FAIL: page did not load: %s\n", error.localizedDescription.UTF8String); exit(2); }
    [self showOffline:error];
}

- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    if (self.selfTestMode) { printf("FAIL: page did not load: %s\n", error.localizedDescription.UTF8String); exit(2); }
    [self showOffline:error];
}

#pragma mark - Menus

- (NSMenuItem *)itemTitled:(NSString *)title action:(SEL)action key:(NSString *)key target:(id)target {
    NSMenuItem *item = [[NSMenuItem alloc] initWithTitle:title action:action keyEquivalent:key];
    item.target = target;
    return item;
}

- (NSMenu *)addMenuTitled:(NSString *)title to:(NSMenu *)bar {
    NSMenuItem *holder = [[NSMenuItem alloc] init];
    NSMenu *menu = [[NSMenu alloc] initWithTitle:title];
    holder.submenu = menu;
    [bar addItem:holder];
    return menu;
}

- (void)buildMenu {
    NSMenu *bar = [[NSMenu alloc] init];

    NSMenu *app = [self addMenuTitled:@"TeamPulse" to:bar];
    [app addItemWithTitle:@"About TeamPulse" action:@selector(orderFrontStandardAboutPanel:) keyEquivalent:@""];
    [app addItem:[NSMenuItem separatorItem]];
    [app addItemWithTitle:@"Hide TeamPulse" action:@selector(hide:) keyEquivalent:@"h"];
    NSMenuItem *hideOthers = [app addItemWithTitle:@"Hide Others" action:@selector(hideOtherApplications:) keyEquivalent:@"h"];
    hideOthers.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagOption;
    [app addItemWithTitle:@"Show All" action:@selector(unhideAllApplications:) keyEquivalent:@""];
    [app addItem:[NSMenuItem separatorItem]];
    [app addItemWithTitle:@"Quit TeamPulse" action:@selector(terminate:) keyEquivalent:@"q"];

    // Edit menu, so copy and paste work in the forms.
    NSMenu *edit = [self addMenuTitled:@"Edit" to:bar];
    [edit addItemWithTitle:@"Undo" action:NSSelectorFromString(@"undo:") keyEquivalent:@"z"];
    NSMenuItem *redo = [edit addItemWithTitle:@"Redo" action:NSSelectorFromString(@"redo:") keyEquivalent:@"z"];
    redo.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagShift;
    [edit addItem:[NSMenuItem separatorItem]];
    [edit addItemWithTitle:@"Cut" action:@selector(cut:) keyEquivalent:@"x"];
    [edit addItemWithTitle:@"Copy" action:@selector(copy:) keyEquivalent:@"c"];
    [edit addItemWithTitle:@"Paste" action:@selector(paste:) keyEquivalent:@"v"];
    [edit addItemWithTitle:@"Select All" action:@selector(selectAll:) keyEquivalent:@"a"];

    NSMenu *go = [self addMenuTitled:@"Go" to:bar];
    [go addItem:[self itemTitled:@"Home page" action:@selector(goLanding) key:@"1" target:self]];
    [go addItem:[self itemTitled:@"Sign in" action:@selector(goSignIn) key:@"2" target:self]];
    [go addItem:[self itemTitled:@"My dashboard" action:@selector(goDashboard) key:@"3" target:self]];
    [go addItem:[self itemTitled:@"Register as a team leader" action:@selector(goRegister) key:@"4" target:self]];
    [go addItem:[NSMenuItem separatorItem]];
    [go addItem:[self itemTitled:@"Open this page in the browser" action:@selector(openInBrowser) key:@"" target:self]];

    NSMenu *view = [self addMenuTitled:@"View" to:bar];
    [view addItem:[self itemTitled:@"Reload" action:@selector(reloadPage) key:@"r" target:self]];
    [view addItem:[NSMenuItem separatorItem]];
    [view addItem:[self itemTitled:@"Zoom In" action:@selector(zoomIn) key:@"=" target:self]];
    [view addItem:[self itemTitled:@"Zoom Out" action:@selector(zoomOut) key:@"-" target:self]];
    [view addItem:[self itemTitled:@"Actual Size" action:@selector(zoomReset) key:@"0" target:self]];
    [view addItem:[NSMenuItem separatorItem]];
    NSMenuItem *fs = [view addItemWithTitle:@"Enter Full Screen" action:@selector(toggleFullScreen:) keyEquivalent:@"f"];
    fs.keyEquivalentModifierMask = NSEventModifierFlagCommand | NSEventModifierFlagControl;

    NSMenu *win = [self addMenuTitled:@"Window" to:bar];
    [win addItemWithTitle:@"Minimize" action:@selector(performMiniaturize:) keyEquivalent:@"m"];
    [win addItemWithTitle:@"Zoom" action:@selector(performZoom:) keyEquivalent:@""];
    [NSApp setWindowsMenu:win];

    [NSApp setMainMenu:bar];
}

#pragma mark - Actions

- (void)goLanding { [self loadPath:@"/"]; }
- (void)goSignIn { [self loadPath:@"/signin"]; }
- (void)goDashboard { [self loadPath:@"/dashboard"]; } // sends you to sign in first if you are not signed in
- (void)goRegister { [self loadPath:@"/register"]; }
- (void)reloadPage { if (self.webView.URL.host) { [self.webView reload]; } else { [self loadHome]; } }
- (void)openInBrowser { NSURL *u = self.webView.URL.host ? self.webView.URL : [self siteURL]; [[NSWorkspace sharedWorkspace] openURL:u]; }
- (void)zoomIn { self.webView.pageZoom = MIN(self.webView.pageZoom + 0.1, 3.0); }
- (void)zoomOut { self.webView.pageZoom = MAX(self.webView.pageZoom - 0.1, 0.5); }
- (void)zoomReset { self.webView.pageZoom = 1.0; }

#pragma mark - Self-test (run with --selftest)

- (void)runSelfTest {
    if (self.testStarted) { return; }
    self.testStarted = YES;
    NSURL *scriptURL = [[NSBundle mainBundle] URLForResource:@"selftest" withExtension:@"js"];
    NSString *script = [NSString stringWithContentsOfURL:scriptURL encoding:NSUTF8StringEncoding error:nil];
    if (!script) { printf("FAIL: selftest.js is missing from the app\n"); exit(2); }
    [self.webView callAsyncJavaScript:script arguments:@{} inFrame:nil inContentWorld:[WKContentWorld pageWorld] completionHandler:^(id result, NSError *error) {
        if (error) {
            NSString *detail = error.userInfo[@"WKJavaScriptExceptionMessage"] ?: error.localizedDescription;
            NSString *line = [NSString stringWithFormat:@"%@", error.userInfo[@"WKJavaScriptExceptionLineNumber"]];
            printf("FAIL: the test could not run: %s (line %s)\n", detail.UTF8String, line.UTF8String);
            exit(2);
        }
        NSString *text = [result isKindOfClass:[NSString class]] ? result : [NSString stringWithFormat:@"%@", result];
        printf("%s\n", text.UTF8String);
        exit([text containsString:@"FAIL"] ? 1 : 0);
    }];
}

@end

static AppDelegate *gDelegate;

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        BOOL selfTest = NO;
        for (int i = 1; i < argc; i++) { if (strcmp(argv[i], "--selftest") == 0) { selfTest = YES; } }
        NSApplication *app = [NSApplication sharedApplication];
        gDelegate = [[AppDelegate alloc] init];
        app.delegate = gDelegate;
        [app setActivationPolicy:selfTest ? NSApplicationActivationPolicyAccessory : NSApplicationActivationPolicyRegular];
        [app run];
    }
    return 0;
}
