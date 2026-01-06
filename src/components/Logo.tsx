// src/components/Logo.tsx
import Link from "next/link";
import Image from "next/image";

type LogoProps = {
  compact?: boolean;
};

const Logo: React.FC<LogoProps> = ({ compact = false }) => {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="relative h-8 w-8 sm:h-9 sm:w-9">
        <Image
          src="/autograde-logo.png" // <-- update if your file is named differently
          alt="AutoGradeHQ logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-400 group-hover:text-cyan-300 transition-colors">
            AutoGrade
          </span>
          <span className="text-xs text-slate-300">
            AI-Powered Upgrade Advisor
          </span>
        </div>
      )}
    </Link>
  );
};

export default Logo;
