import { useState, useRef } from "react";
import { Camera, X, Upload, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentImage?: string;
  name: string;
  nameEn?: string;
  onImageChange: (imageUrl: string | undefined) => void;
  disabled?: boolean;
}

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  currentImage,
  name,
  nameEn,
  onImageChange,
  disabled = false,
}: AvatarUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      const objectPath = response.objectPath;
      onImageChange(objectPath);
      toast({
        title: "Image uploaded",
        description: "Profile picture has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setPreviewUrl(currentImage);
    },
  });

  const initials = getInitials(name, nameEn);
  const colorClass = stringToColor(name || nameEn || "");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    await uploadFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onImageChange(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar 
          className={cn(
            "h-24 w-24 text-2xl cursor-pointer transition-opacity",
            isUploading && "opacity-50",
            !disabled && "hover:opacity-80"
          )}
          onClick={handleClick}
          data-testid="avatar-upload-preview"
        >
          {previewUrl && (
            <AvatarImage 
              src={previewUrl} 
              alt={name || nameEn} 
              className="object-cover"
            />
          )}
          <AvatarFallback className={cn(colorClass, "font-medium")}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        {!disabled && !isUploading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={handleClick}
          >
            <Camera className="h-6 w-6 text-white" />
          </div>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
        
        {previewUrl && !disabled && !isUploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            data-testid="button-remove-avatar"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        data-testid="input-avatar-file"
      />

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
          data-testid="button-upload-avatar"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 me-2" />
              {previewUrl ? "Change Photo" : "Upload Photo"}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
