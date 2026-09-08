from pathlib import Path

message = "Hello from TensorNote Project Experiment"
Path("output.txt").write_text(message + "\n", encoding="utf-8")
print(message)
