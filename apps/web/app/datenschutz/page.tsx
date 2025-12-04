import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung – Tag der Betriebe – OSZ Teltow',
  description: 'Datenschutzerklärung und Informationen zur Datenverarbeitung',
}

export default function DatenschutzPage() {
  return (
    <div className="from-background to-muted/30 min-h-screen bg-gradient-to-b">
      <div className="container max-w-3xl py-12">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Startseite
        </Link>

        <h1 className="mb-8 text-3xl font-bold">Datenschutzerklärung</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">1. Datenschutz auf einen Blick</h2>

            <h3 className="mt-4 text-lg font-medium">Allgemeine Hinweise</h3>
            <p className="text-muted-foreground mt-2">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
              personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene
              Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
            </p>

            <h3 className="mt-4 text-lg font-medium">Datenerfassung auf dieser Website</h3>
            <p className="text-muted-foreground mt-2">
              <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong>
              <br />
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen
              Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Wie erfassen wir Ihre Daten?</strong>
              <br />
              Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei
              kann es sich z.B. um Daten handeln, die Sie in ein Buchungsformular eingeben. Andere
              Daten werden automatisch beim Besuch der Website durch unsere IT-Systeme erfasst. Das
              sind vor allem technische Daten (z.B. Internetbrowser, Betriebssystem oder Uhrzeit des
              Seitenaufrufs).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Verantwortliche Stelle</h2>
            <p className="text-muted-foreground mt-4">
              Verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
            </p>
            <p className="mt-4">
              Oberstufenzentrum Teltow
              <br />
              Potsdamer Straße 4
              <br />
              14513 Teltow
              <br />
              <br />
              Telefon: (03328) 35 07 0
              <br />
              E-Mail: info@osz-teltow.de
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Datenerfassung bei Terminbuchung</h2>

            <h3 className="mt-4 text-lg font-medium">Welche Daten werden erfasst?</h3>
            <p className="text-muted-foreground mt-2">Bei einer Terminbuchung erheben wir:</p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>Firmenname</li>
              <li>Ansprechpartner (Name)</li>
              <li>E-Mail-Adresse</li>
              <li>Telefonnummer (optional)</li>
              <li>Anzahl der Auszubildenden</li>
              <li>Name und Klasse des/der Auszubildenden (optional)</li>
              <li>Elternkontakt (optional)</li>
              <li>Notizen zum Termin (optional)</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">Zweck der Datenverarbeitung</h3>
            <p className="text-muted-foreground mt-2">
              Die Daten werden ausschließlich zur Durchführung und Organisation des Tags der
              Betriebe verwendet. Dies umfasst:
            </p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>Terminbestätigung per E-Mail</li>
              <li>Terminerinnerungen</li>
              <li>Kommunikation bei Terminänderungen</li>
              <li>Interne Planung und Organisation</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium">Rechtsgrundlage</h3>
            <p className="text-muted-foreground mt-2">
              Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Erfüllung eines
              Vertrags bzw. vorvertraglicher Maßnahmen) sowie Art. 6 Abs. 1 lit. e DSGVO
              (Wahrnehmung einer Aufgabe im öffentlichen Interesse – Bildungsauftrag der Schule).
            </p>

            <h3 className="mt-4 text-lg font-medium">Speicherdauer</h3>
            <p className="text-muted-foreground mt-2">
              Die Buchungsdaten werden für die Dauer der Veranstaltungsplanung gespeichert und
              spätestens 3 Monate nach Ende der Veranstaltung gelöscht, sofern keine gesetzlichen
              Aufbewahrungspflichten bestehen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. E-Mail-Kommunikation</h2>
            <p className="text-muted-foreground mt-4">
              Bei der Buchung eines Termins erhalten Sie automatisierte E-Mails:
            </p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>Buchungsbestätigung mit Termindetails und Stornierungscode</li>
              <li>Terminerinnerung vor dem Veranstaltungstag</li>
              <li>Ggf. Benachrichtigungen bei Terminänderungen</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Diese E-Mails sind für die Durchführung der Buchung erforderlich und stellen keine
              Werbung dar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Cookies und lokale Speicherung</h2>
            <p className="text-muted-foreground mt-4">
              Diese Website verwendet ausschließlich technisch notwendige Cookies und lokale
              Speicherung (localStorage) für:
            </p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>
                <strong>Session-Management:</strong> Speicherung des Anmeldestatus für Lehrkräfte
              </li>
              <li>
                <strong>Cookie-Einwilligung:</strong> Speicherung Ihrer Datenschutz-Präferenzen
              </li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Es werden keine Tracking-, Analyse- oder Werbe-Cookies verwendet. Eine Einwilligung
              für technisch notwendige Cookies ist gemäß § 25 Abs. 2 TDDDG nicht erforderlich.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Hosting</h2>
            <p className="text-muted-foreground mt-4">
              Diese Website wird auf Servern in Deutschland gehostet. Der Hosting-Anbieter erhebt in
              sogenannten Server-Logfiles folgende Daten, die Ihr Browser automatisch übermittelt:
            </p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>Browsertyp und -version</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse (anonymisiert)</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und nach 7 Tagen
              automatisch gelöscht.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Ihre Rechte</h2>
            <p className="text-muted-foreground mt-4">Sie haben jederzeit das Recht auf:</p>
            <ul className="text-muted-foreground mt-2 list-disc pl-6">
              <li>
                <strong>Auskunft</strong> (Art. 15 DSGVO): Informationen über Ihre gespeicherten
                Daten
              </li>
              <li>
                <strong>Berichtigung</strong> (Art. 16 DSGVO): Korrektur unrichtiger Daten
              </li>
              <li>
                <strong>Löschung</strong> (Art. 17 DSGVO): Löschung Ihrer Daten, sofern keine
                Aufbewahrungspflichten bestehen
              </li>
              <li>
                <strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)
              </li>
              <li>
                <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Erhalt Ihrer Daten in einem
                maschinenlesbaren Format
              </li>
              <li>
                <strong>Widerspruch</strong> (Art. 21 DSGVO): Widerspruch gegen die Verarbeitung
              </li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannte verantwortliche
              Stelle oder den Datenschutzbeauftragten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Beschwerderecht</h2>
            <p className="text-muted-foreground mt-4">
              Sie haben das Recht, sich bei einer Aufsichtsbehörde für Datenschutz über die
              Verarbeitung Ihrer personenbezogenen Daten zu beschweren. In der Regel können Sie sich
              hierfür an die Aufsichtsbehörde Ihres üblichen Aufenthaltsortes, Ihres Arbeitsplatzes
              oder des Orts des mutmaßlichen Verstoßes wenden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Datensicherheit</h2>
            <p className="text-muted-foreground mt-4">
              Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre Daten
              gegen zufällige oder vorsätzliche Manipulation, Verlust, Zerstörung oder den Zugriff
              unberechtigter Personen zu schützen. Unsere Sicherheitsmaßnahmen werden entsprechend
              der technologischen Entwicklung fortlaufend verbessert.
            </p>
            <p className="text-muted-foreground mt-2">
              Die Übertragung aller Daten erfolgt verschlüsselt über HTTPS/TLS.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Änderung der Datenschutzerklärung</h2>
            <p className="text-muted-foreground mt-4">
              Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an
              geänderte Rechtslagen oder bei Änderungen des Dienstes sowie der Datenverarbeitung
              anzupassen. Die jeweils aktuelle Version finden Sie auf dieser Seite.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-muted-foreground text-sm">
            Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  )
}
