export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <footer className="p-6 md:px-12 text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
        Created by Azfar Danish
      </footer>
    </>
  );
}
