import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";
import Logo from "@/components/layout/Logo";

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#F7F5FF] px-6 text-slate-950">
            <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <div className="flex justify-center">
                        <Logo />
                    </div>

                    <h1 className="mt-6 text-3xl font-black">Forgot password?</h1>

                    <p className="mt-2 text-slate-500">
                        Enter your email and we’ll send you a reset link.
                    </p>
                </div>

                <ForgotPasswordForm />
            </div>
        </main>
    );
}