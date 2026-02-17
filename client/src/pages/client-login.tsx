import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

export default function ClientLogin() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const t = {
    ar: {
      title: "بوابة العميل",
      subtitle: "سجل دخولك لمتابعة خدماتك وفواتيرك",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      login: "تسجيل الدخول",
      loggingIn: "جاري تسجيل الدخول...",
      loginSuccess: "تم تسجيل الدخول بنجاح",
      loginError: "خطأ في تسجيل الدخول",
      invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      staffLogin: "موظف؟ سجل دخولك من هنا",
    },
    en: {
      title: "Client Portal",
      subtitle: "Sign in to track your services and invoices",
      email: "Email",
      password: "Password",
      login: "Sign In",
      loggingIn: "Signing in...",
      loginSuccess: "Logged in successfully",
      loginError: "Login failed",
      invalidCredentials: "Invalid email or password",
      staffLogin: "Staff? Sign in here",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/client/auth/login", formData);

      toast({
        title: content.loginSuccess,
      });

      setLocation("/client");
    } catch (error: any) {
      toast({
        title: content.loginError,
        description: content.invalidCredentials,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription>{content.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{content.email}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="client@example.com"
                required
                data-testid="input-client-email"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{content.password}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="input-client-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-client-login"
            >
              {isLoading ? content.loggingIn : content.login}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary"
              data-testid="link-staff-login"
            >
              {content.staffLogin}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
