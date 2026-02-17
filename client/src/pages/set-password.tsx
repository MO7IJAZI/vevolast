import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, Eye, EyeOff, Lock, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription>
              {content.welcome}, {inviteData?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{content.password}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-10 pe-10"
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute end-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <RequirementItem met={validation.length} label={content.requirements.length} />
                <RequirementItem met={validation.uppercase} label={content.requirements.uppercase} />
                <RequirementItem met={validation.lowercase} label={content.requirements.lowercase} />
                <RequirementItem met={validation.number} label={content.requirements.number} />
                <RequirementItem met={validation.special} label={content.requirements.special} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{content.confirmPassword}</Label>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="ps-10"
                    required
                    disabled={isLoading}
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isPasswordValid || password !== confirmPassword}
                data-testid="button-set-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {content.setting}
                  </>
                ) : (
                  content.setPassword
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
