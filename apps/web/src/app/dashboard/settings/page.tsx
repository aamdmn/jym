"use client";

import { api } from "@jym/backend/convex/_generated/api";
import { useCustomer } from "autumn-js/react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const router = useRouter();
  const deleteAccount = useMutation(api.users.deleteAccount);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { openBillingPortal, checkout, customer } = useCustomer();

  // Check if user has pay_as_you_go subscription
  const hasPayAsYouGo =
    customer?.products?.some(
      (product) => product.id === "pay_as_you_go" && product.status === "active"
    ) ?? false;

  const handleBillingPortal = () => {
    setIsLoadingBilling(true);
    try {
      toast.promise(openBillingPortal(), {
        loading: "Loading...",
        success: "Billing portal loaded",
        error: "Failed to load billing portal",
      });
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const { error } = await checkout({
        productId: "pay_as_you_go",
        successUrl: `${window.location.origin}/app/settings`,
      });

      if (error) {
        toast.error("Failed to start checkout. Please try again.");
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const result = await deleteAccount({});

      if (result.success) {
        // Sign out the user
        await authClient.signOut();
        // Redirect to home page
        router.push("/");
      } else {
        setDeleteError(result.message);
      }
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto my-10 flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-serif text-4xl text-primary">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Upgrade Card - Only show if user doesn't have pay_as_you_go */}
        {!hasPayAsYouGo && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>Upgrade to Premium</CardTitle>
              <CardDescription>
                Unlock unlimited workouts and personalized coaching with our
                pay-as-you-go plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                disabled={isUpgrading}
                onClick={handleUpgrade}
                type="button"
              >
                {isUpgrading ? "Loading..." : "Upgrade Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Billing Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription>
              Manage your subscription and payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              disabled={isLoadingBilling}
              onClick={handleBillingPortal}
              type="button"
              variant="outline"
            >
              {isLoadingBilling ? "Loading..." : "Manage Billing"}
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Card */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data including workouts,
                    progress, and preferences from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError && (
                  <p className="text-destructive text-sm">{deleteError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    type="button"
                  >
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
