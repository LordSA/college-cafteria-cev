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
      <footer className="w-full bg-[#F47721] text-white px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center text-center text-xs text-white">
          <p>
            © {new Date().getFullYear()} Cafeteria CEV. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
