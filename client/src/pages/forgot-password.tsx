import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const t = {
    ar: {
      title: "نسيت كلمة المرور",
      subtitle: "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أدخل بريدك الإلكتروني",
      send: "إرسال رابط إعادة التعيين",
      sending: "جاري الإرسال...",
      backToLogin: "العودة لتسجيل الدخول",
      sentTitle: "تم الإرسال",
      sentMessage: "إذا كان هذا البريد مسجلاً، ستتلقى رابط إعادة تعيين كلمة المرور",
    },
    en: {
      title: "Forgot Password",
      subtitle: "Enter your email to reset your password",
      email: "Email",
      emailPlaceholder: "Enter your email",
      send: "Send Reset Link",
      sending: "Sending...",
      backToLogin: "Back to Login",
      sentTitle: "Email Sent",
      sentMessage: "If this email is registered, you will receive a password reset link",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
      setIsSent(true);
    } catch (err: any) {
      toast({
        title: err.message || "Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">{content.sentTitle}</h2>
            <p className="text-muted-foreground mb-6">{content.sentMessage}</p>
            <Button onClick={() => setLocation("/login")}>{content.backToLogin}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription>{content.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{content.email}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={content.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ps-10"
                    required
                    disabled={isLoading}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-send-reset"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {content.sending}
                  </>
                ) : (
                  content.send
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setLocation("/login")}
                data-testid="button-back-to-login"
              >
                <ArrowLeft className="me-2 h-4 w-4" />
                {content.backToLogin}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
