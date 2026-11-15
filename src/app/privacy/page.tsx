import Link from "next/link";
import { Brand } from "@/components/AuthShell";

export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <main className="legal">
      <Brand />
      <h1>Privacy notice</h1>
      <p className="sub">Last updated 15 November 2026. This explains what TeamPulse keeps about you, why, and what you can ask us to do. It is written to follow the Nigeria Data Protection Act 2023.</p>

      <h2>Who is responsible</h2>
      <p>TeamPulse is a private tool that one NeoLife team uses to run its monthly check-ins. Your team leader decides who is added and runs the team, so your leader is the person in charge of your information. TeamPulse is an independent tool and is not part of, or endorsed by, NeoLife International.</p>

      <h2>What we keep</h2>
      <ul>
        <li><b>Who you are:</b> your name, email address, NeoLife ID, TeamPulse ID, sponsor, title and the date you joined.</li>
        <li><b>What you add yourself:</b> phone number, city, short bio and profile photo. These are optional.</li>
        <li><b>Your monthly check-ins:</b> your answers about your plan, PPV, earnings, payment and sign-ups, and the PPV and QPV figures worked out from them.</li>
        <li><b>Team activity:</b> the team feed, the emails sent to you and when, and a record of important actions such as password resets, so mistakes can be traced.</li>
        <li><b>Your password:</b> only as a scrambled (hashed) value. Nobody, including your leader, can read it.</li>
      </ul>

      <h2>Why we keep it</h2>
      <p>To let you sign in, to run the monthly check-in and reminders, to show your leader and your upline how the team is doing, to work out titles and monthly status, and to keep the service safe. We do not sell your information and we do not use it for advertising.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>You see your own information.</li>
        <li>Your team leader sees everyone on the team. Senior Managers and above see their own downline only.</li>
        <li>Other members of the team see your name, title and photo in the feed and tree.</li>
        <li>Three services help us run the site and handle data for us: Supabase (database), Vercel (hosting) and Resend (email). They may store data outside Nigeria. We share nothing else with anyone unless the law requires it.</li>
      </ul>

      <h2>Cookies and device storage</h2>
      <p>We use one sign-in cookie so you stay signed in, and a small note in your browser that remembers you opened the desktop app. There are no advertising or tracking cookies.</p>

      <h2>How long we keep it</h2>
      <p>For as long as you are on the team. When your leader removes you, or you ask us to delete your account, your personal details are deleted. Records that your leader needs for past months may be kept in a form that no longer names you, where the law allows.</p>

      <h2>Your rights</h2>
      <p>You may ask to see what we hold about you, to correct it, to delete it, to limit how it is used, to object to it, or to receive a copy. You can correct your phone, city, bio and photo yourself on your profile page. For anything else, ask your team leader, who can fix or remove your record, or write to <a className="link" href="mailto:teampulse@owpublishiing.com">teampulse@owpublishiing.com</a>. If you are not satisfied, you may complain to the Nigeria Data Protection Commission (<a className="link" href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer">ndpc.gov.ng</a>).</p>

      <h2>Keeping it safe</h2>
      <p>The database is reachable only from the TeamPulse server, sign-in links are single-use and stored only as hashes, passwords are hashed, accounts lock after repeated wrong passwords, and all traffic uses HTTPS. No system is perfectly safe, so please pick a password you use nowhere else.</p>

      <h2>Contact</h2>
      <p>For any privacy question or request, email <a className="link" href="mailto:teampulse@owpublishiing.com">teampulse@owpublishiing.com</a>. Please include your TeamPulse ID so we can find your record.</p>

      <h2>Changes</h2>
      <p>If this notice changes in a way that matters, the new date will appear at the top of this page.</p>

      <p className="legal-back"><Link className="link" href="/signin">Back to sign in</Link></p>
    </main>
  );
}
