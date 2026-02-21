#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import argparse
from scripts.ask_question import ask_notebooklm

parser = argparse.ArgumentParser()
parser.add_argument('--question', required=True)
parser.add_argument('--notebook-url')
args = parser.parse_args()

print(f"[INFO] Asking: {args.question}")
print(f"[INFO] Notebook: {args.notebook_url}")

answer = ask_notebooklm(
    question=args.question,
    notebook_url=args.notebook_url,
    headless=True
)

print("\n" + "="*60)
print("ANSWER:")
print("="*60)
print(answer)
