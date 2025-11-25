import { User } from '@/features/auth/';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-3xl text-white mb-8">Welcome to Decoded</h1>
        <div className="flex justify-center items-center">
          <User />
        </div>
      </div>
    </div>
  );
}