import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Impressum – Tag der Betriebe – OSZ Teltow',
  description: 'Impressum und rechtliche Informationen',
}

export default function ImpressumPage() {
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

        <h1 className="mb-8 text-3xl font-bold">Impressum</h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">Angaben gemäß § 5 TMG</h2>
            <p className="mt-4">
              Landkreis Potsdam-Mittelmark
              <br />
              <br />
              Oberstufenzentrum Teltow
              <br />
              Potsdamer Straße 4
              <br />
              14513 Teltow
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Vertreten durch</h2>
            <p className="mt-4">
              Schulleitung des OSZ-Teltow
              <br />
              Nele Lang-Rehburg
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Kontakt</h2>
            <p className="mt-4">
              Telefon: (03328) 35 07 0
              <br />
              E-Mail: info@osz-teltow.de
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Schulträger</h2>
            <p className="mt-4">
              Landkreis Potsdam-Mittelmark
              <br />
              Niemöllerstraße 1
              <br />
              14806 Bad Belzig
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>
            <p className="mt-4">
              Oberstufenzentrum Teltow
              <br />
              Potsdamer Straße 4
              <br />
              14513 Teltow
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Haftungsausschluss</h2>

            <h3 className="mt-4 text-lg font-medium">Haftung für Inhalte</h3>
            <p className="text-muted-foreground mt-2">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen.
            </p>

            <h3 className="mt-4 text-lg font-medium">Haftung für Links</h3>
            <p className="text-muted-foreground mt-2">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
              übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
              oder Betreiber der Seiten verantwortlich.
            </p>

            <h3 className="mt-4 text-lg font-medium">Urheberrecht</h3>
            <p className="text-muted-foreground mt-2">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung
              und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der
              schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
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
