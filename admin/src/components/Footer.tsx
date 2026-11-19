export function Footer() {
  return (
    <div className="mt-auto w-full print:hidden">
      <svg
        className="relative block w-full h-10 sm:h-14 lg:h-18"
        viewBox="0 0 1440 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d="M0,60 C280,10 500,120 780,55 C1060,-10 1260,95 1440,50 L1440,160 L0,160 Z"
          fill="#F47721"
        />
      </svg>
      <footer className="w-full bg-[#F47721] text-white pt-2 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
          <div className="flex items-center gap-2 text-white/90">
            <span className="font-extrabold text-sm tracking-widest uppercase">CAFETERIA</span>
            <span>·</span>
            <span className="text-xs font-medium">College of Engineering Vadakara</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-white">
            Designed and Developed by IEDC CEV
          </div>
        </div>
      </footer>
    </div>
  );
}
