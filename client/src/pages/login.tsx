import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Loader2, Eye, EyeOff, Lock, Mail, Moon, Sun, Globe } from "lucide-react";
import logoPath from "@assets/logo.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const t = {
    ar: {
      title: "تسجيل الدخول",
      subtitle: "مرحباً بعودتك إلى لوحة تحكم Vevoline",
      email: "البريد الإلكتروني",
      emailPlaceholder: "أدخل بريدك الإلكتروني",
      password: "كلمة المرور",
      passwordPlaceholder: "أدخل كلمة المرور",
      login: "تسجيل الدخول",
      loggingIn: "جاري تسجيل الدخول...",
      forgotPassword: "نسيت كلمة المرور؟",
      loginError: "خطأ في تسجيل الدخول",
      loginSuccess: "تم تسجيل الدخول بنجاح",
      welcome: "مرحباً",
      emailNotFound: "البريد الإلكتروني غير مسجل",
      wrongPassword: "كلمة المرور غير صحيحة",
      accountDeactivated: "الحساب معطل",
    },
    en: {
      title: "Sign In",
      subtitle: "Welcome back to Vevoline Dashboard",
      email: "Email",
      emailPlaceholder: "Enter your email",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      login: "Sign In",
      loggingIn: "Signing in...",
      forgotPassword: "Forgot password?",
      loginError: "Login Error",
      loginSuccess: "Login Successful",
      welcome: "Welcome",
      emailNotFound: "Email not registered",
      wrongPassword: "Incorrect password",
      accountDeactivated: "Account is deactivated",
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case "EMAIL_NOT_FOUND":
        return content.emailNotFound;
      case "WRONG_PASSWORD":
        return content.wrongPassword;
      case "ACCOUNT_DEACTIVATED":
        return content.accountDeactivated;
      default:
        return error || content.loginError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast({
        title: content.loginSuccess,
        description: content.welcome,
      });
      setLocation("/");
    } else {
      toast({
        title: content.loginError,
        description: getErrorMessage(result.error),
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4 relative">
      <div className="absolute top-4 start-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          data-testid="button-toggle-theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLanguage}
          className="h-9 w-9"
          data-testid="button-toggle-language"
        >
          <Globe className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img 
            src={logoPath} 
            alt="Vevoline Logo" 
            className="h-20 w-auto mb-4"
            data-testid="img-logo"
          />
          <p className="text-muted-foreground">{content.subtitle}</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription>{content.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{content.email}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder={content.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                    required
                    disabled={isLoading}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{content.password}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={content.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-0 text-muted-foreground hover:text-primary h-auto"
                  onClick={() => setLocation("/forgot-password")}
                  data-testid="link-forgot-password"
                >
                  {content.forgotPassword}
                </Button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {content.loggingIn}
                  </>
                ) : (
                  content.login
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
