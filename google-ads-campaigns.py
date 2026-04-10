"""
Smart Space – Google Ads Campaign Report
Pulls live campaign performance from account 999-404-1488
Run: python3 google-ads-campaigns.py
"""

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
import warnings
warnings.filterwarnings("ignore")

CUSTOMER_ID = "9994041488"  # Nigel's account: 999-404-1488

def get_campaigns(client):
    ga_service = client.get_service("GoogleAdsService")

    query = """
        SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc
        FROM campaign
        WHERE segments.date DURING LAST_30_DAYS
        ORDER BY metrics.impressions DESC
    """

    try:
        response = ga_service.search(customer_id=CUSTOMER_ID, query=query)

        print(f"\n{'='*70}")
        print(f"  Smart Space – Google Ads Campaign Report (Last 30 Days)")
        print(f"  Account: {CUSTOMER_ID}")
        print(f"{'='*70}\n")

        campaigns = list(response)

        if not campaigns:
            print("  No campaign data found for the last 30 days.")
            print("  (Campaigns may exist but have had no activity)\n")
            return

        for row in campaigns:
            campaign = row.campaign
            metrics = row.metrics

            status = campaign.status.name
            cost = metrics.cost_micros / 1_000_000  # convert micros to euros
            avg_cpc = metrics.average_cpc / 1_000_000 if metrics.average_cpc else 0
            ctr = metrics.ctr * 100

            print(f"  Campaign: {campaign.name}")
            print(f"  ID:           {campaign.id}")
            print(f"  Status:       {status}")
            print(f"  Type:         {campaign.advertising_channel_type.name}")
            print(f"  Impressions:  {metrics.impressions:,}")
            print(f"  Clicks:       {metrics.clicks:,}")
            print(f"  CTR:          {ctr:.2f}%")
            print(f"  Avg CPC:      €{avg_cpc:.2f}")
            print(f"  Cost:         €{cost:.2f}")
            print(f"  Conversions:  {metrics.conversions:.1f}")
            print(f"  {'-'*50}")

        print()

    except GoogleAdsException as ex:
        print(f"\n  Error: {ex.error.code().name}")
        for error in ex.failure.errors:
            print(f"  - {error.message}")
        if "DEVELOPER_TOKEN_NOT_APPROVED" in str(ex):
            print("\n  Note: Your developer token is still at Test Access level.")
            print("  Apply for Basic Access in Google Ads API Center to access real data.")


if __name__ == "__main__":
    client = GoogleAdsClient.load_from_storage("google-ads.yaml")
    get_campaigns(client)
