import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SetPasswordPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [inviteData, setInviteData] = useState<{ email: string; name: string } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState("");

  const t = {
    ar: {
      title: "تعيين كلمة المرور",
      subtitle: "أنشئ كلمة مرور للوصول إلى لوحة التحكم",
      welcome: "مرحباً",
      password: "كلمة المرور",
      confirmPassword: "تأكيد كلمة المرور",
      setPassword: "تعيين كلمة المرور",
      setting: "جاري التعيين...",
      invalidLink: "رابط غير صالح أو منتهي الصلاحية",
      passwordMismatch: "كلمتا المرور غير متطابقتين",
      success: "تم تعيين كلمة المرور بنجاح",
      goToLogin: "الذهاب لتسجيل الدخول",
      requirements: {
        length: "8 أحرف على الأقل",
        uppercase: "حرف كبير",
        lowercase: "حرف صغير",
        number: "رقم",
        special: "رمز خاص",
      },
    },
    en: {
      title: "Set Password",
      subtitle: "Create a password to access the dashboard",
      welcome: "Welcome",
      password: "Password",
      confirmPassword: "Confirm Password",
      setPassword: "Set Password",
      setting: "Setting...",
      invalidLink: "Invalid or expired invitation link",
      passwordMismatch: "Passwords do not match",
      success: "Password set successfully",
      goToLogin: "Go to Login",
      requirements: {
        length: "At least 8 characters",
        uppercase: "Uppercase letter",
        lowercase: "Lowercase letter",
        number: "Number",
        special: "Special character",
      },
    },
  };

  const content = language === "ar" ? t.ar : t.en;

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      checkInvitation(tokenParam);
    } else {
      setError(content.invalidLink);
      setIsChecking(false);
    }
  }, [searchString]);

  const checkInvitation = async (tokenValue: string) => {
    try {
      const response = await fetch(`/api/auth/invite/${tokenValue}`);
      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
      } else {
        setError(content.invalidLink);
      }
    } catch {
      setError(content.invalidLink);
    } finally {
      setIsChecking(false);
    }
  };

  const validatePassword = (pwd: string) => ({
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
  });

  const validation = validatePassword(password);
  const isPasswordValid = Object.values(validation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: content.passwordMismatch,
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordValid) return;

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/set-password", { token, password });
      
      // Clear any existing auth session state
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: content.success,
      });
      setLocation("/login");
    } catch (err: any) {
      toast({
        title: err.message || "Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium mb-4">{error}</p>
            <Button onClick={() => setLocation("/login")}>{content.goToLogin}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RequirementItem = ({ met, label }: { met: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={met ? "text-green-600" : "text-muted-foreground"}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc] dark:bg-[#0a0a0a] p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] relative z-10">
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          
          <CardHeader className="text-center pt-8 pb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Lock className="h-8 w-8" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">{content.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {content.welcome}, <span className="text-foreground font-semibold">{inviteData?.name}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">{content.password}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 h-11 border-muted-foreground/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:border-none p-0 text-base h-full"
                    dir="ltr"
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-muted/30 rounded-xl border border-border/50">
                <RequirementItem met={validation.length} label={content.requirements.length} />
                <RequirementItem met={validation.uppercase} label={content.requirements.uppercase} />
                <RequirementItem met={validation.lowercase} label={content.requirements.lowercase} />
                <RequirementItem met={validation.number} label={content.requirements.number} />
                <RequirementItem met={validation.special} label={content.requirements.special} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">{content.confirmPassword}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-background/50 px-3 h-11 border-muted-foreground/20 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:border-none p-0 text-base h-full"
                    dir="ltr"
                    required
                    disabled={isLoading}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    data-testid="button-toggle-password-confirm"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                disabled={isLoading || !isPasswordValid || password !== confirmPassword}
                data-testid="button-set-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {content.setting}
                  </>
                ) : (
                  content.setPassword
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Vevoline. All rights reserved.
        </p>
      </div>
    </div>
  );
}
