export function WelcomeBanner({ message }: { message: string }) {
  return (
    <section aria-label="Welcome message" className="section-block border-brand-200 bg-brand-50">
      <div className="section-block-body">
        <p className="text-lg leading-relaxed text-slate-900 sm:text-xl sm:leading-relaxed">
          {message}
        </p>
      </div>
    </section>
  );
}
