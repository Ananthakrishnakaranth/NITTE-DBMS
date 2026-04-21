import argparse

from ml.recommender import get_top_recommendations


def main():
    parser = argparse.ArgumentParser(description="Run recommendation model for a user.")
    parser.add_argument("--user-id", type=int, default=1, help="User ID for generating top recommendations")
    parser.add_argument("--top-n", type=int, default=5, help="Number of songs to recommend")
    args = parser.parse_args()

    recommendations = get_top_recommendations(args.user_id, top_n=args.top_n)

    if not recommendations:
        print("No recommendations generated.")
        return

    print(f"Top {args.top_n} recommendations for user {args.user_id}:")
    for idx, song in enumerate(recommendations, start=1):
        title = song.get("title", "Unknown")
        artist = song.get("artist", "Unknown")
        genre = song.get("genre", "Unknown")
        score = song.get("final_score", song.get("fallback_score", 0))
        print(f"{idx}. {title} - {artist} [{genre}] score={score:.4f}")


if __name__ == "__main__":
    main()
