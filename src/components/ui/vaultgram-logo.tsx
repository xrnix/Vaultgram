import React from "react";
import { cn } from "../../lib/utils";

interface VaultgramLogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  size?: number;
}

export const VaultgramLogo: React.FC<VaultgramLogoProps> = ({
  className,
  size,
  alt = "Vaultgram Logo",
  ...props
}) => {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain select-none shrink-0 pointer-events-none", className)}
      {...props}
    />
  );
};
