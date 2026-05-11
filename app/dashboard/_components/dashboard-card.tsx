import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface StatItem {
  label: string;
  value: number;
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  stats: StatItem[];
  actionLabel: string;
  showAction?: boolean;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  href,
  stats,
  actionLabel,
  showAction = true,
}: DashboardCardProps) {
  const allEmpty = stats.every((s) => s.value === 0);

  return (
    <Link href={href} className="group block">
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center gap-2">
          <Icon className="size-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {allEmpty ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <ul className="space-y-1">
              {stats.map((stat) => (
                <li
                  key={stat.label}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                  </span>
                  <span className="font-semibold text-lg leading-tight">
                    {stat.value}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        {showAction && (
          <CardFooter className="mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="pointer-events-none w-full"
            >
              {actionLabel}
            </Button>
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}
