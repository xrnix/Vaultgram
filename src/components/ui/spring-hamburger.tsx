import React from "react";
import { motion } from "framer-motion";

interface SpringHamburgerProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export const SpringHamburger: React.FC<SpringHamburgerProps> = ({
  isOpen,
  onClick,
  className = "",
}) => {
  const springConfig = { type: "spring", stiffness: 450, damping: 28 };

  return (
    <button
      onClick={onClick}
      className={`relative flex h-8 w-8 items-center justify-center rounded-sm text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none ${className}`}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <div className="relative flex h-3 w-3.5 flex-col justify-between items-center pointer-events-none">
        {/* Top Bar: Rotates +45deg and translates down 5px */}
        <motion.span
          animate={isOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
          transition={springConfig}
          className="h-[1.5px] w-full rounded-full bg-zinc-300 origin-center"
        />
        {/* Middle Bar: Scales down to 0 and fades out */}
        <motion.span
          animate={isOpen ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="h-[1.5px] w-full rounded-full bg-zinc-300"
        />
        {/* Bottom Bar: Rotates -45deg and translates up -5px */}
        <motion.span
          animate={isOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
          transition={springConfig}
          className="h-[1.5px] w-full rounded-full bg-zinc-300 origin-center"
        />
      </div>
    </button>
  );
};
