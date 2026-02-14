import { createAuthClient } from "better-auth/react"

// 扩展better-auth/react的类型定义，确保useSession能识别timezone
declare module "better-auth/react" {
    interface User {
        timezone?: string;
    }
}

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BASE_URL // the base url of your auth server
})

export const signIn = async (type: "github" | "google", options?: { callbackUrl?: string }) => {
    await authClient.signIn.social({
        provider: type,
        callbackURL: options?.callbackUrl
    })
}
export const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    await authClient.signOut()
}
export const { signUp, useSession } = createAuthClient()