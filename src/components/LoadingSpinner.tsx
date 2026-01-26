export default function LoadingSpinner({ 
  message = "Loading...",
  size = "default",
  fullHeight = false
}: { 
  message?: string;
  size?: "small" | "default" | "large";
  fullHeight?: boolean;
}) {
  const sizeClasses = {
    small: "h-4 w-4",
    default: "h-8 w-8",
    large: "h-12 w-12"
  };

  const textSizeClasses = {
    small: "text-sm",
    default: "text-base",
    large: "text-lg"
  };

  const containerClasses = fullHeight 
    ? "flex flex-col items-center justify-center gap-4 min-h-[100vh]"
    : "flex flex-col items-center justify-center gap-4 py-8";

  return (
    <div className={containerClasses}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-700 border-t-blue-600`}></div>
      <p className={`${textSizeClasses[size]} text-gray-400`}>{message}</p>
    </div>
  );
}
