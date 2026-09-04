import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/Breadcrumbs'

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'Terms and Conditions for NotaKPMB — open, no-account archive for KPMB students. Instant publication, no moderation, community responsibility.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main id="main" className="page-shell">
      <Breadcrumbs items={[{ label: 'Index', href: '/' }, { label: 'Terms and Conditions' }]} />

      <article className="mt-8 min-w-0 max-w-3xl">
        <p className="text-sm font-bold text-accent">Legal</p>
        <h1 className="text-dynamic mt-2 text-4xl font-black leading-[0.98] tracking-[-0.04em] text-balance sm:text-5xl md:text-6xl">Terms and Conditions for NotaKPMB</h1>
        <p className="mt-4 text-sm text-muted">Last updated: 4 September 2026</p>

        <div className="text-dynamic mt-10 space-y-10 text-base leading-7 text-muted [&_a]:text-accent [&_a]:underline [&_a]:[overflow-wrap:anywhere] [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:text-base [&_h3]:font-black [&_h3]:text-ink [&_li+li]:mt-2 [&_p+p]:mt-4 [&_section>*+*]:mt-4 [&_strong]:font-bold [&_strong]:text-ink [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 md:[&_h2]:text-2xl">
        <p>
          Welcome to NotaKPMB (“we,” “us,” “the Site”), a student-run, non-commercial digital archive of notes, exercises, and past year questions for KPMB
          students, created and maintained by Azfar Danish. By accessing or using the Site, you agree to be bound by these Terms and Conditions (“Terms”). If you do
          not agree, do not use the Site.
        </p>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">1. Purpose of the Site</h2>
          <p>
            NotaKPMB exists to allow KPMB students to share and access study materials, including notes, exercises, and past year questions, organised by course and
            subject. The Site is community-driven and depends entirely on student contributions.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">2. Open Access, No Account Required</h2>
          <p>
            The Site does not require registration, login, or identity verification of any kind. Any visitor can create, read, update, and delete content on the Site,
            including content originally contributed by someone else. This is a deliberate design of the Site and will not change. By using the Site, you accept this as
            the operating model, including the risk that content you contribute may be altered or removed by another visitor at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">3. User Contributions</h2>
          <h3 className="text-base font-bold !mt-6 !mb-2">3.1 Ownership and Responsibility</h3>
          <p>When you contribute a file to NotaKPMB, you confirm that:</p>
          <ul className="list-disc pl-6">
            <li>You own the content or have the right to share it</li>
            <li>The content does not infringe on any third party’s copyright or intellectual property rights</li>
            <li>The content does not contain confidential, defamatory, unlawful, or personal information you do not intend to make public</li>
          </ul>

          <h3 className="text-base font-bold !mt-6 !mb-2">3.2 Instant Publication, No Review</h3>
          <p>Contributions are published immediately upon upload without prior review or approval. You are solely responsible for the content, accuracy, and legality of anything you submit.</p>

          <h3 className="text-base font-bold !mt-6 !mb-2">3.3 License Granted to NotaKPMB</h3>
          <p>
            By contributing a file, you grant NotaKPMB a non-exclusive, royalty-free, worldwide license to host, display, reproduce, and distribute that file on the
            Site for the purpose of the archive. You retain ownership of your own original content, to the extent it remains identifiable as such.
          </p>

          <h3 className="text-base font-bold !mt-6 !mb-2">3.4 No Guarantee of Persistence or Exclusivity</h3>
          <p>
            Because any visitor can edit or delete any content, we make no guarantee that your contribution will remain unchanged, attributed to you, or available at all
            after you submit it. We are not responsible for content modified or removed by other users.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6">
            <li>Upload content that infringes copyright, including scanned copies of copyrighted textbooks or paid materials you do not have rights to distribute</li>
            <li>Upload malicious files or content intended to harm the Site or its users</li>
            <li>Use automated tools, scripts, or bots to submit, alter, or delete files in bulk or otherwise abuse the open create/read/update/delete system</li>
            <li>Delete, alter, or tamper with other users’ contributions in bad faith or with intent to harm the archive</li>
            <li>Use the Site to harass, defame, or harm any individual</li>
            <li>Attempt to disrupt, hack, or gain unauthorised access to the Site’s infrastructure (as distinct from its intentionally open content system)</li>
            <li>Misrepresent the origin or authorship of any content</li>
          </ul>
          <p>
            While the Site’s content system is intentionally open, misuse that damages the archive or harms other users is still prohibited, even though we may have
            limited practical ability to prevent or trace it.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">5. Accuracy and Integrity of Content</h2>
          <p>
            NotaKPMB is a fully open, community-editable archive with no editorial review, no access control, and no version history. We do not guarantee the accuracy,
            completeness, authenticity, or continued existence of any notes, exercises, or past year questions on the Site. Content may be altered or deleted by any
            visitor at any time. Materials are shared “as is” by students, for students, and should not be treated as official course material or a substitute for
            lecturer-provided resources.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">6. Intellectual Property</h2>
          <p>
            The NotaKPMB name, logo, and site design are the property of Azfar Danish. Contributed files remain the intellectual property of their original authors or
            rights holders, subject to the license granted in Section 3.3 and to the open, editable nature of the Site described in Section 2.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">7. Copyright Complaints</h2>
          <p>If you believe content on NotaKPMB infringes your copyright, contact us using the details in Section 12 with:</p>
          <ul className="list-disc pl-6">
            <li>A description of the copyrighted work</li>
            <li>The location (URL or subject/file reference) of the allegedly infringing content</li>
            <li>Your contact information</li>
          </ul>
          <p>We will review and, where appropriate, remove the content. You may also remove infringing content directly using the Site’s own delete function.</p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">8. No Access Control or Security Warranty</h2>
          <p>
            Files and content on NotaKPMB are not protected by login, permissions, or access restrictions. Any visitor can read, download, modify, or delete any content
            on the Site. We make no warranty regarding the confidentiality, integrity, availability, or continued existence of any content. Do not upload anything you
            consider sensitive, confidential, or irreplaceable.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">9. Disclaimer of Warranties</h2>
          <p>
            The Site is provided “as is” and “as available” without warranties of any kind, express or implied. We do not guarantee the Site will be uninterrupted,
            error-free, secure, or that content will remain available, accurate, or unaltered.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, NotaKPMB and Azfar Danish shall not be liable for any indirect, incidental, or consequential damages arising from
            your use of the Site, including but not limited to academic outcomes, reliance on inaccurate or altered content, loss or deletion of contributed content by
            other users, unauthorised access, or data loss.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">11. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. Continued use of the Site after changes are posted constitutes acceptance of the revised Terms.</p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl !mb-3">12. Contact</h2>
          <p>For questions about these Terms, or to report misuse of the Site, contact:</p>
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
