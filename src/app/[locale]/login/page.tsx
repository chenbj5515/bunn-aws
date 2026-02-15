'use client'
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from 'next-intl'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { signIn } from "@/lib/auth-client"
import { LoadingButton } from "@/components/ui/loading-button"
import { lobster } from "@/font"

export default function LoginPage() {
    const t = useTranslations('login');
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const redirectUrl = searchParams.get('redirect');
    const signupSource = searchParams.get('signupSource');
    const [isGithubLoading, setIsGithubLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    function buildCallbackUrlForAuth() {
        // better-auth 的 callbackURL 需要是绝对 URL（包含 origin），否则会报 Invalid callbackURL
        try {
            const url = new URL(callbackUrl, window.location.origin);
            if (redirectUrl) {
                url.searchParams.set('redirect', redirectUrl);
            }
            return url.toString();
        } catch {
            return window.location.origin;
        }
    }

    // 兜底：如果是从 gated content 跳过来的，把来源写入短期 cookie（用于新用户注册后落库标记）
    // 这样即使上一个页面没成功写 cookie，也能在这里补上
    useEffect(() => {
        try {
            if (!signupSource) return;
            if (!/^[a-z0-9_-]+:[a-z0-9_-]+$/i.test(signupSource)) return;
            document.cookie = `bunn_signup_source=${encodeURIComponent(signupSource)}; path=/; max-age=21600; samesite=lax`;
        } catch {
            // ignore
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function onGitHubSignIn() {
        try {
            setIsGithubLoading(true);            
            // 只执行登录，时区更新会在登录成功后由 useUpdateUserTimezone 处理
            await signIn("github", { callbackUrl: buildCallbackUrlForAuth() });
        } catch (error) {
            console.error("GitHub 登录错误：", error);
            setIsGithubLoading(false);
        }
    }

    async function onGoogleSignIn() {
        try {
            setIsGoogleLoading(true);
            // 只执行登录，时区更新会在登录成功后由 useUpdateUserTimezone 处理
            await signIn("google", { callbackUrl: buildCallbackUrlForAuth() });
        } catch (error) {
            console.error("Google 登录错误：", error);
            setIsGoogleLoading(false);
        }
    }

    // return null;

    return (
        <div className="flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 min-h-screen">
            <Card className="shadow-none md:shadow p-[48px] md:border border-0 w-[458px] md:w-[360px] h-[418px]">
                <CardHeader className="space-y-4 text-center">
                    <div className={`${lobster.className} text-[24px] flex justify-center`}>
                        <a href="#" className="flex items-center gap-2 font-medium">
                            <div className="flex justify-center items-center rounded-md w-[32px] h-[32px] text-primary-foreground">
                                <Image src="/images/logo.jpeg" alt="Brand logo" width={32} height={32} className="rounded-[6px] w-[32px] h-[32px]" />
                            </div>
                            Bunn
                        </a>
                    </div>
                    <div>
                        <CardTitle className="mt-4 text-xl">{t('welcome')}</CardTitle>
                        <CardDescription className="mt-4">{t('description')}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="gap-6 grid mt-[26px]">
                        <div className="flex flex-col gap-4">
                            <LoadingButton
                                variant="default"
                                className="bg-white hover:bg-white opacity-95 shadow-neumorphic hover:shadow-neumorphic-button-hover w-full text-black"
                                onClick={onGitHubSignIn}
                                isLoading={isGithubLoading}
                                disabled={isGithubLoading || isGoogleLoading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 w-4 h-4">
                                    <path
                                        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {t('loginWithGithub')}
                            </LoadingButton>
                            <LoadingButton
                                variant="default"
                                className="bg-white hover:bg-white opacity-95 shadow-neumorphic hover:shadow-neumorphic-button-hover w-full text-black"
                                onClick={onGoogleSignIn}
                                isLoading={isGoogleLoading}
                                disabled={isGithubLoading || isGoogleLoading}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 w-4 h-4">
                                    <path
                                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {t('loginWithGoogle')}
                            </LoadingButton>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <div className="mt-6 text-muted-foreground text-xs text-center text-balance">
                {t('agreement.prefix')} <a href="/terms-of-service" className="hover:text-primary underline underline-offset-4">{t('agreement.terms')}</a> {t('agreement.and')} <a href="/privacy-policy" className="hover:text-primary underline underline-offset-4">{t('agreement.privacy')}</a>{t('agreement.suffix')}
            </div>
        </div>
    )
} 