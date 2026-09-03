import type { LoginRequest } from "@daily-life/shared";
import {
  Button,
  Card,
  Cursor,
  Footer,
  Form,
  FormItem,
  Icon,
  Input,
  Title,
  Typewriter,
  useForm,
} from "animal-island-ui";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dailyAnimals from "@/assets/daily-animals.png";
import { useLogin } from "@/data-provider/mutations/use-login";
import { useAuthSession } from "@/data-provider/queries/use-auth-session";
import { notify } from "@/services/notification.service";

interface LoginLocationState {
  from?: string;
}

export function Component() {
  const [form] = useForm<LoginRequest>();
  const login = useLogin();
  const session = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as LoginLocationState | null)?.from ?? "/";

  useEffect(() => {
    if (session.data) {
      navigate(destination, { replace: true });
    }
  }, [destination, navigate, session.data]);

  const handleLogin = async (values: LoginRequest) => {
    if (!values.username?.trim()) {
      notify.error("请输入用户名。");
      return;
    }
    if (!values.password || values.password.length < 8) {
      notify.error("密码至少需要 8 位。");
      return;
    }
    await login.mutateAsync(values);
  };

  return (
    <Cursor forceAll={false}>
      <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[linear-gradient(to_bottom,var(--animal-primary-color-bg)_0%,var(--animal-bg-color)_48%,var(--animal-bg-color)_100%)] pt-[22px] sm:pt-[clamp(30px,5vh,64px)] [&>.animal-footer]:relative [&>.animal-footer]:z-[1] [&>.animal-footer]:mt-6 [&>.animal-footer]:flex-none sm:[&>.animal-footer]:mt-[clamp(24px,4vh,44px)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute left-[-50px] top-[15%] h-11 w-[170px] rounded-full bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] before:absolute before:bottom-0 before:right-6 before:size-[82px] before:rounded-full before:bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] before:content-[''] after:absolute after:bottom-0 after:left-[26px] after:size-[58px] after:rounded-full after:bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] after:content-[''] sm:left-[7%]" />
          <span className="absolute right-[-64px] top-[9%] h-11 w-[170px] scale-[0.72] rounded-full bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] before:absolute before:bottom-0 before:right-6 before:size-[82px] before:rounded-full before:bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] before:content-[''] after:absolute after:bottom-0 after:left-[26px] after:size-[58px] after:rounded-full after:bg-[color-mix(in_srgb,var(--animal-bg-color)_82%,transparent)] after:content-[''] sm:right-[9%]" />
        </div>
        <div className="relative z-[1] m-auto grid w-[min(520px,calc(100%-32px))] place-items-center sm:w-[min(780px,calc(100%-48px))]">
          <section
            className="relative flex w-[min(500px,100%)] flex-col items-center animate-[login-arrive_350ms_var(--animal-motion-ease)_both]"
            aria-labelledby="login-title"
          >
            <img
              className="relative z-[3] mb-[-8px] h-auto w-[116px] select-none object-contain sm:w-[132px]"
              src={dailyAnimals}
              alt=""
              aria-hidden="true"
              width={1952}
              height={1266}
              draggable="false"
            />
            <Title size="large" color="app-yellow" className="relative z-[2] mb-[-12px]">
              欢迎回到日常集
            </Title>
            <Card className="[--login-input-surface:#fffbe7] w-full px-6 pb-7 pt-10 sm:px-[clamp(28px,5vw,48px)] sm:pb-[34px] sm:pt-[clamp(42px,5vw,54px)] [&_.animal-form-item:last-child]:mb-0 [&_.animal-form-item:last-child]:mt-4">
              <div className="mb-7 text-center [&_h1]:mb-2 [&_h1]:mt-0 [&_h1]:text-[clamp(25px,3vw,34px)] [&_h1]:leading-[1.3] [&_h1]:text-[var(--animal-text-color)] [&_p:last-child]:m-0 [&_p:last-child]:font-semibold [&_p:last-child]:text-[var(--animal-text-color-secondary)]">
                <p className="mb-2 mt-0 text-[length:var(--animal-font-size-sm)] font-black tracking-[0.14em] text-[var(--animal-primary-color-active)]">
                  你的小日子生活岛
                </p>
                <h1 id="login-title">岛上的日常，还好好收着</h1>
                <Typewriter speed={54}>
                  <p>账目、习惯、安排和喜欢，都在这里慢慢长成生活。</p>
                </Typewriter>
              </div>

              <Form
                form={form}
                layout="vertical"
                size="large"
                requiredMark={false}
                onFinish={(values) => void handleLogin(values as LoginRequest)}
              >
                <FormItem name="username" label="用户名">
                  <Input
                    size="large"
                    autoComplete="username"
                    placeholder="输入管理员用户名"
                    prefix={<Icon name="icon-miles" size={20} />}
                    allowClear
                    disabled={login.isPending}
                  />
                </FormItem>

                <FormItem name="password" label="密码">
                  <Input
                    size="large"
                    type="password"
                    autoComplete="current-password"
                    placeholder="输入管理员密码"
                    prefix={<Icon name="icon-design" size={20} />}
                    disabled={login.isPending}
                  />
                </FormItem>

                <FormItem>
                  <Button
                    type="primary"
                    size="large"
                    htmlType="submit"
                    block
                    loading={login.isPending}
                    icon={<Icon name="icon-helicopter" size={22} />}
                  >
                    {login.isPending ? "正在回岛" : "回到我的日常集"}
                  </Button>
                </FormItem>
              </Form>
            </Card>
          </section>
        </div>
        <Footer type="sea" seamless />
      </main>
    </Cursor>
  );
}
