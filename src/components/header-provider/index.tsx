import { getSession } from "@/lib/auth";
import { getUserSettings } from "@/lib/auth/helpers";
import { HeaderWrapper } from "@/components/header-wrapper";

export async function HeaderProvider() {
  // 获取用户会话
  const session = await getSession();
  const isLoggedIn = !!session?.user?.id;

  // 如果用户已登录，获取用户业务数据
  let userSettings = null;
  if (isLoggedIn) {
    userSettings = await getUserSettings(session.user.id);
  }

  return (
    <HeaderWrapper
      isLoggedIn={isLoggedIn}
      user={
        session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              image: session.user.image || null,
            }
          : null
      }
      subscription={userSettings?.subscription}
      achievementPoints={userSettings?.achievementPoints}
    />
  );
}
