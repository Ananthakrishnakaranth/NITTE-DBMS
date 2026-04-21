from typing import List, Tuple

import numpy as np

try:
    import tensorflow as tf
    from tensorflow.keras import layers, models
except Exception:
    tf = None
    layers = None
    models = None


MOOD_LABELS = ["happy", "sad", "energetic", "calm"]


def build_demo_lstm_model(vocab_size: int = 1000, max_len: int = 40):
    if tf is None:
        return None

    model = models.Sequential(
        [
            layers.Embedding(input_dim=vocab_size, output_dim=32, input_length=max_len),
            layers.LSTM(32),
            layers.Dense(16, activation="relu"),
            layers.Dense(len(MOOD_LABELS), activation="softmax"),
        ]
    )
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def train_demo_lstm(
    tokenized_lyrics: np.ndarray,
    labels: np.ndarray,
    epochs: int = 3,
    vocab_size: int = 1000,
    max_len: int = 40,
):
    """Optional educational helper to train a tiny mood classifier."""
    model = build_demo_lstm_model(vocab_size=vocab_size, max_len=max_len)
    if model is None:
        return None
    model.fit(tokenized_lyrics, labels, epochs=epochs, verbose=0)
    return model


def _keyword_mood_heuristic(lyrics: str) -> str:
    text = (lyrics or "").lower()

    if any(word in text for word in ["dance", "party", "jump", "fire", "run"]):
        return "energetic"
    if any(word in text for word in ["smile", "sun", "joy", "bright", "love"]):
        return "happy"
    if any(word in text for word in ["cry", "alone", "dark", "tears", "broken"]):
        return "sad"
    return "calm"


def predict_mood_from_lyrics(lyrics: str, model=None) -> str:
    """
    If a trained model is supplied, this function can be extended to use tokenizer
    + model prediction. For this project we keep a deterministic fallback heuristic.
    """
    _ = model
    return _keyword_mood_heuristic(lyrics)
