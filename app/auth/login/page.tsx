import LoginForm from "@/components/forms/LoginForm";
import Logo from "@/components/layout/Logo";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-10 shadow-2xl">
                <div className="mb-10 text-center">
                    <div className="flex justify-center">
                        <div className="scale-[1.8] origin-center">
                            <Logo />
                        </div>
                    </div>
                </div>

                <LoginForm />
            </div>
        </main>
    );
}