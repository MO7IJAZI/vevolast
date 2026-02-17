import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface EmployeeAvatarProps {
  name: string;
  nameEn?: string;
  profileImage?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string, nameEn?: string): string {
  const displayName = name || nameEn || "";
  const parts = displayName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function EmployeeAvatar({
  name,
  nameEn,
  profileImage,
  size = "md",
  className,
}: EmployeeAvatarProps) {
  const initials = getInitials(name, nameEn);
  const colorClass = stringToColor(name || nameEn || "");
  
  return (
    <Avatar className={cn(sizeClasses[size], "flex-shrink-0", className)} data-testid={`avatar-${name?.replace(/\s+/g, '-').toLowerCase()}`}>
      {profileImage && (
        <AvatarImage 
          src={profileImage} 
          alt={name || nameEn} 
          className="object-cover"
        />
      )}
      <AvatarFallback className={cn(colorClass, "font-medium")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
