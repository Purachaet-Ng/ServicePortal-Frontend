import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getDepartments } from "@/api/departments.api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useRegister } from "@/features/auth/useAuthQueries";
import { registerSchema } from "@/validators/auth.validator";

export function RegisterPage() {
  const navigate = useNavigate();
  const {
    register: field,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  // GET /api/departments is not mounted yet, so this fails and the select
  // falls back to a disabled state. departmentId is optional on the backend, so
  // registration still works without it.
  const departments = useQuery({
    queryKey: ["departments", "list"],
    queryFn: () => getDepartments(),
    retry: false,
    staleTime: 10 * 60_000,
  });

  const departmentOptions = departments.data?.data ?? departments.data ?? [];
  const registerMutation = useRegister();

  const onSubmit = (values) =>
    registerMutation.mutate(
      { ...values, phone: values.phone || undefined },
      {
        onSuccess: () => {
          // Register returns { message, user } with NO token — the user is not
          // signed in yet, so send them to log in rather than pretending.
          toast.success("Account created. Please sign in.");
          navigate("/login");
        },
        onError: (error) => {
          // Map per-field errors onto the inputs; only fall back to a form-wide
          // message when the backend did not say which field was at fault.
          if (error.errors?.length) {
            for (const detail of error.errors) {
              if (detail.field) {
                setError(detail.field, { type: "server", message: detail.message });
              }
            }
            return;
          }
          setError(error.status === 409 ? "email" : "root", {
            type: "server",
            message:
              error.status === 409
                ? "That email is already registered"
                : error.message,
          });
        },
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Roles are assigned by an administrator after the account exists.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstname">First name</Label>
              <Input id="firstname" aria-invalid={!!errors.firstname} {...field("firstname")} />
              {errors.firstname && (
                <p className="text-xs text-destructive">{errors.firstname.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastname">Last name</Label>
              <Input id="lastname" aria-invalid={!!errors.lastname} {...field("lastname")} />
              {errors.lastname && (
                <p className="text-xs text-destructive">{errors.lastname.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              aria-invalid={!!errors.email}
              {...field("email")}
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
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...field("password")}
            />
            <p className="text-xs text-muted-foreground">At least 6 characters</p>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              placeholder="081-234-5678"
              aria-invalid={!!errors.phone}
              {...field("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select
              disabled={!departmentOptions.length}
              value={watch("departmentId") ? String(watch("departmentId")) : ""}
              onValueChange={(value) => setValue("departmentId", Number(value))}
            >
              <SelectTrigger id="departmentId" className="w-full">
                <SelectValue
                  placeholder={
                    departmentOptions.length
                      ? "Select your department"
                      : "Departments unavailable"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={String(department.id)}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!departmentOptions.length && (
              <p className="text-xs text-muted-foreground">
                Needs GET /api/departments — an admin can set this later.
              </p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending && <Spinner />}
            Create account
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default RegisterPage;
