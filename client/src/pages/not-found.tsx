import { Link } from "wouter";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export default function NotFound() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="text-8xl font-bold text-primary/20 mb-4">404</div>
      <h1 className="text-2xl font-bold mb-2">
        {language === "ar" ? "الصفحة غير موجودة" : "Page Not Found"}
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {language === "ar"
          ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها"
          : "The page you're looking for doesn't exist or has been moved"}
      </p>
      <Button asChild>
        <Link href="/">
          <Home className="h-4 w-4 me-2" />
          {language === "ar" ? "العودة للرئيسية" : "Back to Home"}
        </Link>
      </Button>
    </div>
  );
}
