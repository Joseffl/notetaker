import { SignInButton } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Page() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center">
                <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
                <p className="mt-2 text-sm text-muted-foreground">Use your Google account to continue.</p>
                <div className="mt-6">
                    <SignInButton>
                        <Button className="w-full cursor-pointer">Continue with Google</Button>
                    </SignInButton>
                </div>
            </div>
        </div>
    );
}
