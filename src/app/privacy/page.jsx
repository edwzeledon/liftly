import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Liftly',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display font-bold uppercase text-3xl md:text-4xl mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          This policy is being drafted. Liftly stores your workout and nutrition logs solely to
          provide the service. Contact: yessirskiwspg@gmail.com.
        </p>
        <Link href="/" className="text-protein-text font-bold hover:underline">← Back to Liftly</Link>
      </div>
    </div>
  );
}
