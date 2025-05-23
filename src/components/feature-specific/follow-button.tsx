// src/components/feature-specific/follow-button.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserCheck as UserCheckIcon } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { useFollowUserMutation, useUnfollowUserMutation } from '@/hooks/use-user-profile-query';
import { cn } from '@/lib/utils';

interface FollowButtonProps extends Omit<ButtonProps, 'onClick'> {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  size?: 'sm' | 'lg' | 'default'; 
  showIcon?: boolean;
  showText?: boolean;
}

export default function FollowButton({ 
  userId, 
  isFollowing: initialIsFollowing, 
  onFollowChange,
  variant = 'pixel',
  size = 'default',
  showIcon = false,
  showText = true,
  className,
  ...props
}: FollowButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  
  // Use the follow/unfollow mutations from our hooks
  const followMutation = useFollowUserMutation();
  const unfollowMutation = useUnfollowUserMutation();
  
  // Track loading state
  const isLoading = followMutation.isPending || unfollowMutation.isPending;

  // Sync state from props
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleFollow = async () => {
    if (!session) {
      // Redirect to login if not authenticated
      toast.error('Please sign in to follow users');
      router.push('/login');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow user - but first update UI state optimistically
        setIsFollowing(false);
        if (onFollowChange) onFollowChange(false);
        
        // Execute the unfollow mutation
        await unfollowMutation.mutateAsync(userId);
      } else {
        // Follow user - but first update UI state optimistically
        setIsFollowing(true);
        if (onFollowChange) onFollowChange(true);
        
        // Execute the follow mutation
        await followMutation.mutateAsync(userId);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      
      // Revert the optimistic update on error
      setIsFollowing(initialIsFollowing);
      if (onFollowChange) onFollowChange(initialIsFollowing);
      
      // Show error toast
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  if (session?.user?.id === userId) {
    // Don't show follow button for the current user
    return null;
  }

  return (
    <Button
      onClick={handleFollow}
      variant={isFollowing ? 'outline' : variant}
      size={size}
      className={cn("min-w-[80px]", className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          {showIcon && (
            isFollowing ? 
              <UserCheckIcon className="h-4 w-4 mr-2" /> : 
              <UserPlus className="h-4 w-4 mr-2" />
          )}
          {showText && (isFollowing ? 'Following' : 'Follow')}
        </>
      )}
    </Button>
  );
}