import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useLogin } from "@/features/auth/useAuthQueries";
import { loginSchema } from "@/validators/auth.validator";

export function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const login = useLogin();

  const onSubmit = (values) =>
    login.mutate(values, {
      onError: (error) => {
        // A 401 here is a wrong email OR a wrong password — the backend
        // deliberately uses one message for both so it does not reveal which
        // emails are registered (API.md).
        //
        // Show it INLINE on the form, not as a toast: it is a correction to
        // what they just typed, and it belongs next to the fields.
        setError("root", {
          type: "server",
          message:
            error.status === 401
              ? "Incorrect email or password"
              : error.message,
        });
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Use your company email to continue.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <Spinner />}
            Sign in
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Do not have an account?{" "}
            <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default LoginPage;
