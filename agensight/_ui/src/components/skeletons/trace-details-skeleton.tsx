import { Card , CardContent,CardAction } from "../ui/card";
import { Skeleton } from "../ui/skeleton";




export function TraceDetailSkeleton() {
    return (
      <div className="flex w-full h-full">
        {/* Left panel skeleton */}
        <div className="w-3/5 border-r overflow-hidden">
          <div className="border-b bg-card/50 pt-4 px-4 pb-2">
            <Skeleton className="h-6 w-40 mb-2" />
          </div>
          <div className="p-4">
            <Card className="overflow-hidden border border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="pl-8 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="border-t bg-card/50 pt-4 px-4 pb-2 mt-4">
            <Skeleton className="h-6 w-40 mb-2" />
          </div>
          <div className="p-4">
            <Card className="overflow-hidden border border-border">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2 border-b pb-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="pl-8 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Right panel skeleton */}
        <div className="w-2/5 p-4">
          <div className="flex flex-col">
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="border rounded-md p-4" style={{ height: '450px' }}>
              {/* Timeline axis skeleton */}
              <div className="flex justify-between mb-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-10" />
                ))}
              </div>
              
              {/* Gantt chart skeleton - use fixed values instead of random */}
              <div className="flex-1">
                <div className="flex items-center mb-4">
                    <Skeleton className="w-32 h-4 mr-3" />
                    <div className="flex-1 relative h-6">
                      <Skeleton 
                        className="absolute h-full rounded-sm" 
                      style={{ left: "10%", width: "40%" }}
                      />
                    </div>
                  </div>
                <div className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                      style={{ left: "15%", width: "55%" }}
                    />
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                      style={{ left: "25%", width: "30%" }}
                    />
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                      style={{ left: "5%", width: "70%" }}
                    />
                  </div>
                </div>
                <div className="flex items-center mb-4">
                  <Skeleton className="w-32 h-4 mr-3" />
                  <div className="flex-1 relative h-6">
                    <Skeleton 
                      className="absolute h-full rounded-sm" 
                      style={{ left: "20%", width: "45%" }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Legend skeleton */}
              <div className="mt-2 pt-2 border-t flex flex-wrap gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }