import { useState } from "react";
import {
  Globe,
  Moon,
  Sun,
  DollarSign,
  Lock,
  Loader2,
  CheckCircle2,
  Monitor,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/avatar-upload";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCurrency, currencies, type Currency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SettingsPage() {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const { user, checkAuth } = useAuth();
  const { toast } = useToast();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const t = {
    ar: {
      title: "الإعدادات",
      subtitle: "إدارة تفضيلاتك الشخصية وتجربة الاستخدام",
      profile: "الملف الشخصي",
      profileDesc: "تحديث صورتك الشخصية وبياناتك",
      language: "اللغة",
      languageDesc: "اختر لغة واجهة النظام المفضلة لديك",
      arabic: "العربية",
      english: "English",
      theme: "المظهر (الوضع الليلي)",
      themeDesc: "تخصيص مظهر النظام ليناسب عينيك",
      light: "فاتح",
      dark: "داكن",
      system: "تلقائي",
      currency: "العملة",
      currencyDesc: "اختر العملة التي تود عرض المبالغ بها",
      security: "الأمان وكلمة المرور",
      securityDesc: "تحديث كلمة المرور الخاصة بحسابك",
      forgotCurrentPassword: "نسيت كلمة المرور الحالية؟",
      resetTriggered: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني",
      currentPassword: "كلمة المرور الحالية",
      newPassword: "كلمة المرور الجديدة",
      confirmPassword: "تأكيد كلمة المرور الجديدة",
      changePassword: "تحديث كلمة المرور",
      passwordChanged: "تم تغيير كلمة المرور بنجاح",
      passwordError: "فشل تغيير كلمة المرور. تأكد من صحة كلمة المرور الحالية",
      passwordsDontMatch: "كلمات المرور غير متطابقة",
      profileUpdated: "تم تحديث الملف الشخصي",
    },
    en: {
      title: "Settings",
      subtitle: "Manage your personal preferences and user experience",
      profile: "Profile",
      profileDesc: "Update your profile picture and info",
      language: "Language",
      languageDesc: "Choose your preferred interface language",
      arabic: "Arabic",
      english: "English",
      theme: "Appearance (Dark Mode)",
      themeDesc: "Customize the system look to suit your eyes",
      light: "Light",
      dark: "Dark",
      system: "System",
      currency: "Currency",
      currencyDesc: "Choose the currency you want to display amounts in",
      security: "Security & Password",
      securityDesc: "Update your account password",
      forgotCurrentPassword: "Forgot current password?",
      resetTriggered: "Reset link has been sent to your email",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      changePassword: "Update Password",
      passwordChanged: "Password changed successfully",
      passwordError: "Failed to change password. Make sure current password is correct",
      passwordsDontMatch: "Passwords do not match",
      profileUpdated: "Profile updated successfully",
    },
  }[language];

  const handleAvatarChange = async (newAvatar: string | undefined) => {
    if (!newAvatar) return;
    try {
      await apiRequest("PATCH", "/api/auth/profile", { avatar: newAvatar });
      await checkAuth(); // Refresh user context to update header
      toast({
        title: t.profileUpdated,
        description: language === "ar" ? "تم تحديث صورتك الشخصية" : "Your profile picture has been updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) return;
    
    setIsResetting(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: user.email });
      toast({
        title: t.resetTriggered,
        description: user.email,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: t.passwordsDontMatch,
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (res.ok) {
        toast({
          title: t.passwordChanged,
          description: language === "ar" ? "يمكنك الآن استخدام كلمة المرور الجديدة" : "You can now use your new password",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        throw new Error(data.error || t.passwordError);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.profile}</CardTitle>
            <CardDescription>{t.profileDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center sm:items-start gap-6">
            <AvatarUpload
              currentImage={user?.profileImage}
              name={user?.name || ""}
              nameEn={user?.nameEn}
              onImageChange={handleAvatarChange}
            />
          </CardContent>
        </Card>

        {/* Top Section: Language & Theme */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {/* Language Setting */}
          <Card className="flex flex-col">
            <CardHeader className="flex-none">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t.language}</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">{t.languageDesc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={language === "ar" ? "default" : "ghost"}
                  onClick={() => setLanguage("ar")}
                  className="flex-1 h-9 text-sm"
                >
                  {t.arabic}
                </Button>
                <Button
                  variant={language === "en" ? "default" : "ghost"}
                  onClick={() => setLanguage("en")}
                  className="flex-1 h-9 text-sm"
                >
                  {t.english}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Setting */}
          <Card className="flex flex-col">
            <CardHeader className="flex-none">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{t.theme}</CardTitle>
              </div>
              <CardDescription className="text-xs sm:text-sm">{t.themeDesc}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <div className="flex flex-wrap sm:flex-nowrap gap-2 p-1 bg-muted rounded-lg">
                <Button
                  variant={theme === "light" ? "default" : "ghost"}
                  onClick={() => setTheme("light")}
                  className="flex-1 h-9 gap-2 text-sm"
                >
                  <Sun className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{t.light}</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "ghost"}
                  onClick={() => setTheme("dark")}
                  className="flex-1 h-9 gap-2 text-sm"
                >
                  <Moon className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{t.dark}</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "ghost"}
                  onClick={() => setTheme("system")}
                  className="flex-1 h-9 gap-2 text-sm"
                >
                  <Monitor className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{t.system}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Currency & Security */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Currency Setting */}
          <div className="lg:col-span-5 flex flex-col">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t.currency}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t.currencyDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(currencies) as Currency[]).map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{currencies[curr].symbol}</span>
                          <span className="text-sm">{curr} - {language === "ar" ? currencies[curr].nameAr : currencies[curr].name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Password Security Setting */}
          <div className="lg:col-span-7 flex flex-col">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t.security}</CardTitle>
                </div>
                <CardDescription className="text-xs sm:text-sm">{t.securityDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="currentPassword" id="currentPasswordLabel" className="text-sm">{t.currentPassword}</Label>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                          onClick={handleForgotPassword}
                          disabled={isResetting}
                        >
                          {isResetting ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : null}
                          {t.forgotCurrentPassword}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 rounded-md border bg-background px-3 h-11 border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                        <Input
                          id="currentPassword"
                          type={showPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:border-none p-0 text-sm h-full"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 outline-none"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2 lg:grid-cols-2 lg:col-span-1">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" id="newPasswordLabel" className="text-sm">{t.newPassword}</Label>
                        <div className="flex items-center gap-2 rounded-md border bg-background px-3 h-11 border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                          <Input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:border-none p-0 text-sm h-full"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" id="confirmPasswordLabel" className="text-sm">{t.confirmPassword}</Label>
                        <div className="flex items-center gap-2 rounded-md border bg-background px-3 h-11 border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                          <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:border-none p-0 text-sm h-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 gap-2 mt-2" 
                    disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    <span className="text-sm sm:text-base">{t.changePassword}</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
