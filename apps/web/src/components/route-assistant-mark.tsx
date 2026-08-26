export function RouteAssistantMark() {
  return (
    <span className="route-assistant-mark" aria-hidden="true">
      <svg viewBox="0 0 72 72" focusable="false">
        <circle
          className="route-assistant-mark__orbit"
          cx="36"
          cy="36"
          r="25"
        />
        <circle
          className="route-assistant-mark__endpoint"
          cx="18.5"
          cy="18.5"
          r="4.5"
        />
        <circle
          className="route-assistant-mark__endpoint"
          cx="53.5"
          cy="53.5"
          r="4.5"
        />
      </svg>
    </span>
  );
}
