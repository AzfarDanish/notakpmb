import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for NotaKPMB — a student-run, non-commercial archive. No accounts, no tracking of contributors, files stored in Cloudflare R2.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <main id="main" className="page-shell py-8 md:py-14">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Privacy Policy' }]} />

      <article className="mt-10 max-w-3xl">
        <p className="text-sm font-bold text-accent">Legal</p>
        <h1 className="mt-2 text-5xl font-black leading-[0.95] tracking-[-0.05em] text-balance md:text-6xl">Privacy Policy for NotaKPMB</h1>
        <p className="mt-4 text-sm text-muted">Last updated: 4 September 2026</p>

        <div className="mt-10 space-y-10 text-sm leading-7 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-ink [&_strong]:font-bold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-6">
        <p>
          NotaKPMB (“we,” “us,” “the Site”) is a student-run, non-commercial digital archive of notes, exercises, and past year questions for KPMB students, created
          and maintained by Azfar Danish. This Privacy Policy explains what information is collected when you use the Site and how it is handled.
        </p>
        <p>By using NotaKPMB, you agree to the practices described in this Privacy Policy.</p>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">1. Fully Open, Anonymous System</h2>
          <p>
            NotaKPMB has no login, no accounts, and no identity verification of any kind. Anyone who visits the Site can create, read, update, and delete content,
            including content contributed by other people. This is an intentional design choice, not a limitation. There is no way for us, or anyone, to trace an
            action on the Site back to a specific individual through the app itself.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">2. Information Collected When You Contribute</h2>
          <p>When you submit a file through the Contribute feature, we collect only:</p>
          <ul className="list-disc pl-6">
            <li>The file you upload</li>
            <li>The title you give it</li>
          </ul>
          <p>
            We do not collect your name, email, student ID, or any other identifying information, and there is no field for it. Contributions are anonymous by
            default and by design.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">3. No Moderation, No Access Control</h2>
          <p>
            Content on NotaKPMB is published instantly with no review, and can be edited or deleted by anyone at any time, not just the original contributor. We do
            not verify who is adding, changing, or removing content. Do not treat anything you upload as permanent, protected, or exclusively under your control once
            it is on the Site.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">4. Do Not Upload Personal Information</h2>
          <p>
            Because any visitor can view, modify, or delete any file, and because we cannot verify who is acting on the Site, you must not upload files containing
            your name, student ID, contact details, or any other personal or identifying information, unless you are fully comfortable with that information being
            public and outside your control indefinitely.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">5. File Storage and Access</h2>
          <p>
            Uploaded files are stored in Cloudflare R2. Files are retrievable through the Site’s application by anyone. There are no access restrictions on reading,
            downloading, editing, or deleting files once they are contributed.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">6. Analytics and Tracking</h2>
          <p>The Site uses the following analytics and tracking tools:</p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Vercel Analytics</strong> — aggregate usage and performance data
            </li>
            <li>
              <strong>Google Analytics 4 (Google Tag Manager)</strong> — page views and site usage
            </li>
            <li>
              <strong>Google Search Console</strong> — search indexing verification
            </li>
          </ul>
          <p>
            These tools may collect standard technical data such as IP address, browser type, device type, and pages visited, in accordance with their own privacy
            policies. NotaKPMB does not use this data to personally identify individual contributors, and no cookie-consent mechanism is currently implemented on the
            Site.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">7. Infrastructure-Level Logging</h2>
          <p>
            The app itself does not log or store your IP address, browser information, or user agent, and does not tie any content action to a specific visitor. Our
            infrastructure providers, Cloudflare and Vercel, may automatically log this information as part of standard web hosting and security operations. NotaKPMB
            does not have a built-in way to use these logs to identify who created, changed, or deleted a specific piece of content.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">8. Data Retention and Permanence</h2>
          <p>
            Content persists until any visitor deletes or overwrites it. There is no automatic backup, version history, or recovery system. Once content is deleted by
            any user, it may be permanently and irrecoverably lost. We do not guarantee that any file you contribute will remain available, unaltered, or exist at all
            at a later time.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">9. Removal Requests</h2>
          <p>
            Because any visitor can already delete content directly on the Site, we do not operate a separate removal-request process. If you believe a file contains
            personal information about you, you or anyone else may remove it directly using the Site’s own delete function. If you are unable to do so, you may contact
            us using the details in Section 11, though we cannot guarantee action given the open nature of the system.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">10. Children’s Privacy</h2>
          <p>
            NotaKPMB is intended for use by KPMB students and is not directed at children under the age of 13. We do not knowingly collect personal information from
            children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated “Last updated” date. Continued use of the Site
            after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">12. Contact</h2>
          <p>For questions about this Privacy Policy, contact:</p>
          <p>
            Azfar Danish
            <br />
            <a href="mailto:azfardns@gmail.com">azfardns@gmail.com</a>
            <br />
            Instagram:{' '}
            <a href="https://instagram.com/azferish" target="_blank" rel="noopener noreferrer">
              https://instagram.com/azferish
            </a>
          </p>
        </section>
        </div>
      </article>
    </main>
  )
}
