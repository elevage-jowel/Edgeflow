import { LoginForm } from './LoginForm';

export default function Login({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <div className="a-login">
      <LoginForm next={searchParams.next ?? '/admin'} configured={!!process.env.ADMIN_PASSWORD} />
    </div>
  );
}
