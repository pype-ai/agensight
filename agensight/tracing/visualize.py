from .exporters import get_collected_spans
from .utils import ns_to_seconds

def visualize_trace():
    spans = get_collected_spans()
    if not spans:
        print("No spans collected.")
        return

    spans.sort(key=lambda x: x.start_time)
    first_time = spans[0].start_time

    for span in spans:
        span.relative_start = ns_to_seconds(span.start_time - first_time)
        span.relative_end = ns_to_seconds(span.end_time - first_time)
        span.duration = span.relative_end - span.relative_start

    print(f"\n{'Name':<25} {'Start':<10} {'Duration':<10} {'Attributes'}")
    print("-" * 80)
    for span in spans:
        print(f"{span.name:<25} {span.relative_start:.2f}s   {span.duration:.2f}s   {span.attributes}")
    
    print("\nFlow Diagram")
    print("-" * 80)
    max_duration = max(span.duration for span in spans)
    scale = 50 / max_duration if max_duration > 0 else 1
    for span in spans:
        bar = "█" * max(1, int(span.duration * scale))
        print(f"{span.name:<25} [{bar}] {span.duration:.2f}s")
