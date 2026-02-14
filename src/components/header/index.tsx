import { getSession } from "@/lib/auth";
import { getUserSettings } from "@/lib/auth/helpers";
import UserPanel from "@/components/user-panel";

export default async function Header() {
  // 获取用户会话
  const session = await getSession();

  if (!session?.user) {
    // 用户未登录，可以在这里添加登录按钮或其他UI
    return null; // 或者返回一个登录按钮组件
  }

  // 获取用户业务数据（订阅状态、成就点数等）
  const userSettings = await getUserSettings(session.user.id);

  return (
    <header className="top-4 left-4 z-50 absolute">
      <UserPanel
        user={{
          id: session.user.id,
          email: session.user.email,
          image: session.user.image || null,
        }}
        subscription={userSettings.subscription}
        initialAchievementPoints={userSettings.achievementPoints}
      />
    </header>
  );
}