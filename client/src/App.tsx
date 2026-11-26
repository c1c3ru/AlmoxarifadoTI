import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";
const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Items = lazy(() => import("@/pages/items"));
const Search = lazy(() => import("@/pages/search"));
const Scanner = lazy(() => import("@/pages/scanner"));
const Movements = lazy(() => import("@/pages/movements"));
const History = lazy(() => import("@/pages/history"));
const Users = lazy(() => import("@/pages/users"));
const Categories = lazy(() => import("@/pages/categories"));
const NotFound = lazy(() => import("@/pages/not-found"));
const RegisterUserPage = lazy(() => import("@/pages/register"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const ConsumptionDashboard = lazy(() => import("@/pages/consumption"));
import { SpeedInsights } from "@vercel/speed-insights/react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary-600 mb-4"></i>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function Router() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="min-h-dvh flex items-center justify-center text-gray-700">Carregando interface…</div>}>
      <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>

      <Route path="/register">
        {user ? <Redirect to="/" /> : <RegisterUserPage />}
      </Route>

      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/items">
        <ProtectedRoute>
          <Items />
        </ProtectedRoute>
      </Route>
      
      <Route path="/search">
        <ProtectedRoute>
          <Search />
        </ProtectedRoute>
      </Route>
      
      <Route path="/scanner">
        <ProtectedRoute>
          <Scanner />
        </ProtectedRoute>
      </Route>
      
      <Route path="/movements">
        <ProtectedRoute>
          <Movements />
        </ProtectedRoute>
      </Route>
      
      <Route path="/history">
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      </Route>
      
      <Route path="/consumption">
        <ProtectedRoute>
          <ConsumptionDashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/users">
        <ProtectedRoute>
          <AdminRoute>
            <Users />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      
      <Route path="/categories">
        <ProtectedRoute>
          <AdminRoute>
            <Categories />
          </AdminRoute>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <SpeedInsights />
          </TooltipProvider>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
