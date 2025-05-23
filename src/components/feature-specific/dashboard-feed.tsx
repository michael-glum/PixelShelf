'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import AssetCard from '@/components/feature-specific/asset-card';
import { Skeleton } from '@/components/ui/skeleton-loader';
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Grid as GridIcon,
  LayoutList,
  Users,
} from 'lucide-react';
import { 
  useAssetsQuery, 
  useInfiniteAssetsQuery 
} from '@/hooks/use-assets-query';
import { 
  useCreatorsQuery, 
  useInfiniteCreatorsQuery, 
  useTrendingCreatorsQuery 
} from '@/hooks/use-creators-query';
import { PAGINATION } from '@/constants';
import { Asset, UserProfile } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { AssetGridFilters } from '@/components/shared/asset-grid';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

export type TabOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  requiredAuth?: boolean;
};

export interface DashboardFeedProps {
  initialTab?: string;
  className?: string;
  tabs?: TabOption[];
  title?: string;
  description?: string;
  searchQuery?: string;
  selectedTags?: string[];
  selectedType?: string | null;
  onFilterChange?: (filters: AssetGridFilters) => void;
  showSearch?: boolean;
  infiniteScroll?: boolean;
  emptyFollowingComponent?: React.ReactNode;
  itemsPerRow?: number; // Prop for controlling layout
  showSidecards?: boolean; // Prop to toggle sidecards visibility
  defaultViewMode?: 'grid' | 'list'; // Default view mode
  listViewFirst?: boolean; // Control order of view buttons
  onViewModeChange?: (mode: 'grid' | 'list') => void; // Callback for view mode changes
}

const DEFAULT_TABS: TabOption[] = [
  {
    id: 'trending',
    label: 'Trending',
    icon: <TrendingUp className="h-4 w-4 mr-2" />,
  },
  {
    id: 'following',
    label: 'Following',
    icon: <UserCheck className="h-4 w-4 mr-2" />,
    requiredAuth: true,
  },
];

export function DashboardFeed({
  initialTab = 'trending',
  className,
  tabs = DEFAULT_TABS,
  title,
  description,
  searchQuery = '',
  selectedTags = [],
  selectedType = null,
  onFilterChange,
  showSearch = true,
  infiniteScroll = true,
  emptyFollowingComponent,
  itemsPerRow = 4, // Default to 4 items per row
  showSidecards = false, // Default to not showing sidecards
  defaultViewMode = 'grid', // Default view mode
  listViewFirst = false, // Default to grid view first
  onViewModeChange, // Callback for view mode changes
}: DashboardFeedProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(defaultViewMode);
  
  // State for dynamic item count when toggling view mode
  const [currentItemsPerRow, setCurrentItemsPerRow] = useState(itemsPerRow);
  const [showCurrentSidecards, setShowCurrentSidecards] = useState(showSidecards);

  // Initialize viewMode and related states from props
  useEffect(() => {
    setViewMode(defaultViewMode);
    if (defaultViewMode === 'list' && showSidecards) {
      setCurrentItemsPerRow(1);
      setShowCurrentSidecards(true);
    } else if (defaultViewMode === 'grid' && !showSidecards) {
      setCurrentItemsPerRow(itemsPerRow);
      setShowCurrentSidecards(false);
    }
  }, [defaultViewMode, itemsPerRow, showSidecards]);

  // Trending feed (infinite)
  const {
    data: trendingInfiniteData,
    isLoading: isTrendingInfiniteLoading,
    error: trendingInfiniteError,
    hasNextPage: trendingHasNextPage,
    isFetchingNextPage: isTrendingFetchingNextPage,
    fetchNextPage: fetchNextTrendingPage,
    refetch: reloadTrendingInfinite,
  } = useInfiniteAssetsQuery({
    sort: 'popular',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'trending' ? searchQuery : undefined,
    tag: activeTab === 'trending' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'trending' ? selectedType || undefined : undefined,
    enabled: activeTab === 'trending' && infiniteScroll,
  });

  // Following feed (infinite, only for authenticated users)
  const {
    data: followingInfiniteData,
    isLoading: isFollowingInfiniteLoading,
    error: followingInfiniteError,
    hasNextPage: followingHasNextPage,
    isFetchingNextPage: isFollowingFetchingNextPage,
    fetchNextPage: fetchNextFollowingPage,
    refetch: reloadFollowingInfinite,
  } = useInfiniteAssetsQuery({
    sort: 'latest',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'following' ? searchQuery : undefined,
    tag: activeTab === 'following' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'following' ? selectedType || undefined : undefined,
    following: true, // Set to true to only show posts from followed users
    enabled: activeTab === 'following' && !!session && infiniteScroll,
  });

  // Assets feed (for explore page)
  const {
    data: assetsInfiniteData,
    isLoading: isAssetsInfiniteLoading,
    error: assetsInfiniteError,
    hasNextPage: assetsHasNextPage,
    isFetchingNextPage: isAssetsInfiniteFetchingNextPage,
    fetchNextPage: fetchNextAssetsPage,
    refetch: reloadAssetsInfinite,
  } = useInfiniteAssetsQuery({
    sort: 'latest',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'assets' ? searchQuery : undefined,
    tag: activeTab === 'assets' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'assets' ? selectedType || undefined : undefined,
    enabled: activeTab === 'assets' && infiniteScroll,
  });
  
  // Creators feed (infinite, for explore page)
  const {
    data: creatorsInfiniteData,
    isLoading: isCreatorsInfiniteLoading,
    error: creatorsInfiniteError,
    hasNextPage: creatorsHasNextPage,
    isFetchingNextPage: isCreatorsInfiniteFetchingNextPage,
    fetchNextPage: fetchNextCreatorsPage,
    refetch: reloadCreatorsInfinite,
  } = useInfiniteCreatorsQuery({
    search: activeTab === 'creators' ? searchQuery : undefined,
    tag: activeTab === 'creators' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    sort: 'popular', // Default to popular for creators
    enabled: activeTab === 'creators' && infiniteScroll,
  });

  // Non-infinite queries (as fallback or when infiniteScroll is disabled)
  const {
    assets: trendingAssets,
    isLoading: isTrendingLoading,
    error: trendingError,
    hasMore: trendingHasMore,
    isLoadingMore: isTrendingLoadingMore,
    loadMore: loadMoreTrending,
    refetch: reloadTrending,
  } = useAssetsQuery({
    sort: 'popular',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'trending' ? searchQuery : undefined,
    tag: activeTab === 'trending' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'trending' ? selectedType || undefined : undefined,
    enabled: activeTab === 'trending' && !infiniteScroll,
  });

  const {
    assets: followingAssets,
    isLoading: isFollowingLoading,
    error: followingError,
    hasMore: followingHasMore,
    isLoadingMore: isFollowingLoadingMore,
    loadMore: loadMoreFollowing,
    refetch: reloadFollowing,
  } = useAssetsQuery({
    sort: 'latest',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'following' ? searchQuery : undefined,
    tag: activeTab === 'following' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'following' ? selectedType || undefined : undefined,
    following: true, // Set to true to only show posts from followed users
    enabled: activeTab === 'following' && !!session && !infiniteScroll,
  });

  const {
    assets: assetsData,
    isLoading: isAssetsLoading,
    error: assetsError,
    hasMore: assetsHasMore,
    isLoadingMore: isAssetsLoadingMore,
    loadMore: loadMoreAssets,
    refetch: reloadAssets,
  } = useAssetsQuery({
    sort: 'latest',
    limit: PAGINATION.DEFAULT_LIMIT,
    search: activeTab === 'assets' ? searchQuery : undefined,
    tag: activeTab === 'assets' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    type: activeTab === 'assets' ? selectedType || undefined : undefined,
    enabled: activeTab === 'assets' && !infiniteScroll,
  });
  
  const {
    creators,
    isLoading: isCreatorsLoading,
    error: creatorsError,
    hasMore: creatorsHasMore,
    isLoadingMore: isCreatorsLoadingMore,
    loadMore: loadMoreCreators,
    refetch: reloadCreators,
  } = useCreatorsQuery({
    search: activeTab === 'creators' ? searchQuery : undefined,
    tag: activeTab === 'creators' && selectedTags.length > 0 ? selectedTags[0] : undefined,
    sort: 'popular', // Default to popular for creators
    enabled: activeTab === 'creators' && !infiniteScroll,
  });

  // Create flattened arrays of assets from infinite query pages
  const trendingInfiniteAssets = trendingInfiniteData
    ? trendingInfiniteData.pages.flatMap(page => page.assets)
    : [];
  
  const followingInfiniteAssets = followingInfiniteData
    ? followingInfiniteData.pages.flatMap(page => page.assets)
    : [];
  
  const assetsInfiniteAssets = assetsInfiniteData
    ? assetsInfiniteData.pages.flatMap(page => page.assets)
    : [];
    
  // Create flattened array of creators from infinite query pages
  const creatorsInfiniteItems = creatorsInfiniteData
    ? creatorsInfiniteData.pages.flatMap(page => page.users)
    : [];
  
  // Tab switch handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Pull-to-refresh
  const refreshFeed = async () => {
    setIsRefreshing(true);
    try {
      switch (activeTab) {
        case 'trending':
          if (infiniteScroll) {
            await reloadTrendingInfinite();
          } else {
            await reloadTrending();
          }
          break;
        case 'following':
          if (infiniteScroll) {
            await reloadFollowingInfinite();
          } else {
            await reloadFollowing();
          }
          break;
        case 'assets':
          if (infiniteScroll) {
            await reloadAssetsInfinite();
          } else {
            await reloadAssets();
          }
          break;
        case 'creators':
          if (infiniteScroll) {
            await reloadCreatorsInfinite();
          } else {
            await reloadCreators();
          }
        default:
          if (infiniteScroll) {
            await reloadTrendingInfinite();
          } else {
            await reloadTrending();
          }
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle view mode changes
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    
    // Special handling for home feed (when showSidecards is enabled)
    if (showSidecards) {
      if (mode === 'list') {
        // List view: single column with sidecards
        setCurrentItemsPerRow(1);
        setShowCurrentSidecards(true);
      } else {
        // Grid view: multiple columns without sidecards
        setCurrentItemsPerRow(4); // Default to 4 for grid view
        setShowCurrentSidecards(false);
      }
    }
    
    // Call the callback if provided
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Fetch more data for infinite scrolling
  const fetchMoreForCurrentTab = useCallback(() => {
    switch (activeTab) {
      case 'trending':
        if (trendingHasNextPage && !isTrendingFetchingNextPage) {
          fetchNextTrendingPage();
        }
        break;
      case 'following':
        if (followingHasNextPage && !isFollowingFetchingNextPage) {
          fetchNextFollowingPage();
        }
        break;
      case 'assets':
        if (assetsHasNextPage && !isAssetsInfiniteFetchingNextPage) {
          fetchNextAssetsPage();
        }
        break;
      case 'creators':
        if (creatorsHasNextPage && !isCreatorsInfiniteFetchingNextPage) {
          fetchNextCreatorsPage();
        }
        break;
      default:
        break;
    }
  }, [
    activeTab,
    trendingHasNextPage,
    isTrendingFetchingNextPage,
    fetchNextTrendingPage,
    followingHasNextPage,
    isFollowingFetchingNextPage,
    fetchNextFollowingPage,
    assetsHasNextPage,
    isAssetsInfiniteFetchingNextPage,
    fetchNextAssetsPage,
    creatorsHasNextPage,
    isCreatorsInfiniteFetchingNextPage,
    fetchNextCreatorsPage,
  ]);

  // Get the right data for the active tab
  const getTabData = () => {
    if (infiniteScroll) {
      switch (activeTab) {
        case 'trending':
          return {
            data: trendingInfiniteAssets,
            isLoading: isTrendingInfiniteLoading,
            error: trendingInfiniteError,
            hasMore: trendingHasNextPage,
            isLoadingMore: isTrendingFetchingNextPage,
            loadMore: fetchNextTrendingPage,
          };
        case 'following':
          return {
            data: followingInfiniteAssets,
            isLoading: isFollowingInfiniteLoading,
            error: followingInfiniteError,
            hasMore: followingHasNextPage,
            isLoadingMore: isFollowingFetchingNextPage,
            loadMore: fetchNextFollowingPage,
          };
        case 'assets':
          return {
            data: assetsInfiniteAssets,
            isLoading: isAssetsInfiniteLoading,
            error: assetsInfiniteError,
            hasMore: assetsHasNextPage,
            isLoadingMore: isAssetsInfiniteFetchingNextPage,
            loadMore: fetchNextAssetsPage,
          };
        case 'creators':
          return {
            data: creatorsInfiniteItems,
            isLoading: isCreatorsInfiniteLoading,
            error: creatorsInfiniteError,
            hasMore: creatorsHasNextPage,
            isLoadingMore: isCreatorsInfiniteFetchingNextPage,
            loadMore: fetchNextCreatorsPage,
            type: 'creator', // Type flag to identify creators data
          };
        default:
          return {
            data: trendingInfiniteAssets,
            isLoading: isTrendingInfiniteLoading,
            error: trendingInfiniteError,
            hasMore: trendingHasNextPage,
            isLoadingMore: isTrendingFetchingNextPage,
            loadMore: fetchNextTrendingPage,
          };
      }
    } else {
      // Non-infinite scrolling data
      switch (activeTab) {
        case 'trending':
          return {
            data: trendingAssets,
            isLoading: isTrendingLoading,
            error: trendingError,
            hasMore: trendingHasMore,
            isLoadingMore: isTrendingLoadingMore,
            loadMore: loadMoreTrending,
          };
        case 'following':
          return {
            data: followingAssets,
            isLoading: isFollowingLoading,
            error: followingError,
            hasMore: followingHasMore,
            isLoadingMore: isFollowingLoadingMore,
            loadMore: loadMoreFollowing,
          };
        case 'assets':
          return {
            data: assetsData,
            isLoading: isAssetsLoading,
            error: assetsError,
            hasMore: assetsHasMore,
            isLoadingMore: isAssetsLoadingMore,
            loadMore: loadMoreAssets,
          };
        case 'creators':
          return {
            data: creators,
            isLoading: isCreatorsLoading,
            error: creatorsError,
            hasMore: creatorsHasMore,
            isLoadingMore: isCreatorsLoadingMore,
            loadMore: loadMoreCreators,
            type: 'creator', // Type flag to identify creators data
          };
        default:
          return {
            data: trendingAssets,
            isLoading: isTrendingLoading,
            error: trendingError,
            hasMore: trendingHasMore,
            isLoadingMore: isTrendingLoadingMore,
            loadMore: loadMoreTrending,
          };
      }
    }
  };

  const { data, isLoading, error, hasMore, isLoadingMore, loadMore, type } = getTabData();

  // Set up intersection observer for infinite scrolling
  const fetchNextPage = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      fetchMoreForCurrentTab();
    }
  }, [hasMore, isLoadingMore, fetchMoreForCurrentTab]);
  
  const { ref: loadMoreRef } = useIntersectionObserver({
    rootMargin: '500px', // Increased to start loading earlier
    enabled: infiniteScroll,
    onIntersect: fetchNextPage,
    skip: isLoadingMore, // Skip triggering while already loading
  });

  // Animation variants for grid items
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
        ease: 'easeOut'
      }
    }),
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const getGridClass = useCallback(() => {
    if (viewMode !== 'grid') return 'space-y-4'; // List view remains unchanged
    
    if (currentItemsPerRow === 1) {
      return 'grid grid-cols-1 gap-6 max-w-2xl mx-auto';
    }
    
    // For multiple items per row, create a responsive class
    // that adapts based on screen size
    const gridClass = showCurrentSidecards 
      ? 'grid-single-feed' // Special class for single column with sidecards
      : `grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(currentItemsPerRow, 3)} lg:grid-cols-${currentItemsPerRow} gap-6`;
    
    return `grid ${gridClass}`;
  }, [currentItemsPerRow, viewMode, showCurrentSidecards]);

  // Render custom empty following state or default one
  const renderEmptyFollowingState = () => {
    if (emptyFollowingComponent) {
      return emptyFollowingComponent;
    }
    
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
          <UserCheck className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No assets from creators you follow</h3>
        <p className="text-muted-foreground mb-6">
          Follow some creators to see their work in your feed
        </p>
        <Link href="/explore">
          <Button variant="pixel">Discover Creators</Button>
        </Link>
      </div>
    );
  };

  // Render view mode controls based on order preference
  const renderViewControls = () => {
    const gridButton = (
      <button
        onClick={() => handleViewModeChange("grid")}
        className={`p-2 ${
          viewMode === "grid" ? "bg-muted" : "bg-background"
        }`}
        title="Grid view"
      >
        <GridIcon className="h-4 w-4" />
      </button>
    );
    
    const listButton = (
      <button
        onClick={() => handleViewModeChange("list")}
        className={`p-2 ${
          viewMode === "list" ? "bg-muted" : "bg-background"
        }`}
        title="List view"
      >
        <LayoutList className="h-4 w-4" />
      </button>
    );
    
    return (
      <div className="flex rounded-md overflow-hidden border">
        {listViewFirst ? (
          <>
            {listButton}
            {gridButton}
          </>
        ) : (
          <>
            {gridButton}
            {listButton}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Title and description */}
      {title && (
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      
      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <div className="flex justify-between items-center">
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center"
                disabled={tab.requiredAuth && !session}
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center space-x-2">
            {/* View controls */}
            {renderViewControls()}
            
            <Button
              variant="outline"
              size="sm"
              onClick={refreshFeed}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Dynamic Tab Contents */}
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6 mt-6">
            {/* Tab content logic */}
            {tab.id === 'following' && !session ? (
              <SignInPrompt />
            ) : tab.id === 'creators' ? (
              /* Creators Tab Content */
              isLoading ? (
                <LoadingState type="creator" />
              ) : error ? (
                <ErrorState 
                  error={error instanceof Error ? error.message : "Failed to load creators"} 
                  onRetry={refreshFeed} 
                />
              ) : data.length === 0 ? (
                <EmptyState message="No creators found." />
              ) : (
                <div className={getGridClass()}>
                  {data.map((creator: UserProfile, index: number) => (
                    <motion.div
                      key={creator.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={index % 10}
                    >
                      <CreatorCard creator={creator} variant={viewMode} />
                    </motion.div>
                  ))}
                </div>
              )
            ) : (
              /* Asset Tabs Content (Trending, Following, Assets) */
              isLoading ? (
                <LoadingState type="asset" />
              ) : error ? (
                <ErrorState 
                  error={error instanceof Error ? error.message : "Failed to load assets"} 
                  onRetry={refreshFeed} 
                />
              ) : data.length === 0 ? (
                tab.id === 'following' ? (
                  renderEmptyFollowingState()
                ) : (
                  <EmptyState message={`No ${tab.label.toLowerCase()} found.`} />
                )
              ) : (
                <>
                  {/* Asset Grid or List */}
                  {viewMode === 'grid' ? (
                    <div className={getGridClass()}>
                      {data.map((asset: Asset, index: number) => (
                        <motion.div
                          key={asset.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          custom={index % 10}
                        >
                          <AssetCard key={asset.id} asset={asset} variant="vertical" />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.map((asset: Asset, index: number) => (
                        <motion.div
                          key={asset.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          custom={index % 10}
                        >
                          <AssetCard key={asset.id} asset={asset} variant="horizontal" />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {/* Load more / infinite scroll */}
                  {hasMore && (
                    <div 
                      ref={loadMoreRef}
                      className="w-full flex justify-center py-8"
                      style={{ minHeight: '100px' }}
                    >
                      {infiniteScroll ? (
                        isLoadingMore && (
                          <div className="flex flex-col items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground mt-2">Loading more content...</span>
                          </div>
                        )
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => loadMore()}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More'
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {!hasMore && !isLoading && data.length > 0 && (
                    <div className="w-full flex justify-center py-8 text-muted-foreground text-sm">
                      You've reached the end... post something!
                    </div>
                  )}
                </>
              )
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// Creator Card Component
function CreatorCard({ creator, variant = 'grid' }: { creator: UserProfile, variant: 'grid' | 'list' }) {
  if (variant === 'grid') {
    return (
      <Link 
        href={`/u/${creator.username}`}
        className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      >
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 relative h-24 w-24 rounded-full overflow-hidden bg-muted">
            {creator.image ? (
              <Image 
                src={creator.image} 
                alt={creator.name || ''} 
                fill 
                className="object-cover"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFfwJnQMuRpQAAAABJRU5ErkJggg=="
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
              />
            ) : (
              <Users className="h-24 w-24 p-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-medium text-lg mb-1">{creator.name || creator.username}</h3>
          <p className="text-sm text-muted-foreground mb-3">@{creator.username}</p>
          <p className="text-sm mb-4 line-clamp-2">{creator.bio || 'No bio provided.'}</p>
          <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
            <span>{creator.stats?.followers || 0} followers</span>
            <span>{creator.stats?.assets || 0} assets</span>
          </div>
        </div>
      </Link>
    );
  } else {
    return (
      <Link 
        href={`/u/${creator.username}`}
        className="flex items-center p-4 border rounded-lg hover:shadow-md transition-shadow"
      >
        <div className="flex-shrink-0 mr-4 relative h-16 w-16 rounded-full overflow-hidden bg-muted">
          {creator.image ? (
            <Image 
              src={creator.image} 
              alt={creator.name || ''} 
              fill 
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFfwJnQMuRpQAAAABJRU5ErkJggg=="
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <Users className="h-16 w-16 p-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium mb-1">{creator.name || creator.username}</h3>
          <p className="text-sm text-muted-foreground mb-1">@{creator.username}</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{creator.bio || 'No bio provided.'}</p>
        </div>
        <div className="flex-shrink-0 ml-4 text-sm text-muted-foreground">
          <div>{creator.stats?.followers || 0} followers</div>
          <div>{creator.stats?.assets || 0} assets</div>
        </div>
      </Link>
    );
  }
}

// Loading state component
function LoadingState({ type = 'asset' }: { type?: 'asset' | 'creator' }) {
  if (type === 'creator') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card overflow-hidden p-6">
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-5 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3 mb-3" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <div className="flex space-x-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card overflow-hidden">
          <Skeleton className="aspect-game-card w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center pt-2">
              <Skeleton className="h-8 w-8 rounded-full mr-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Failed to load content</h3>
      <p className="text-muted-foreground mb-6">{error}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}

// Empty state component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <TrendingUp className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No content found</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Link href="/explore">
        <Button variant="pixel">Explore Assets</Button>
      </Link>
    </div>
  );
}

// Sign in prompt component
function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/30">
      <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
        <UserCheck className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Sign in to see your feed</h3>
      <p className="text-muted-foreground mb-6">
        Follow creators and see their latest work in your feed
      </p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button variant="outline">Sign In</Button>
        </Link>
        <Link href="/signup">
          <Button variant="pixel">Create Account</Button>
        </Link>
      </div>
    </div>
  );
}