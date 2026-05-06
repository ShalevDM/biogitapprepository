import streamlit as st
import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).resolve().parent.parent))
import api_client as api

st.title("Settings")

st.subheader("Claude API key")
st.caption("Used to extract markers and cell data from PDFs. Stored locally in your SQLite DB.")
current_key = api.get_setting("anthropic_api_key") or ""
masked = ("•" * 6 + current_key[-4:]) if current_key else "(not set)"
st.write(f"Current: `{masked}`")
new_key = st.text_input("New Claude API key", type="password")
if st.button("Save API key"):
    api.set_setting("anthropic_api_key", new_key.strip() or None)
    st.success("Saved. Reload the page to confirm.")

st.divider()

st.subheader("Institutional PDF access")
st.caption(
    "If your university uses an EZproxy-style URL prefix, paste it here. "
    "Example: `https://login.ezproxy.your-uni.edu/login?url=` — "
    "the app will append the article DOI URL to fetch the PDF through your institution. "
    "Cookie is optional and only needed if your proxy uses session cookies (copy from your browser)."
)
proxy = api.get_setting("institutional_proxy_prefix") or ""
cookie = api.get_setting("institutional_cookie") or ""

new_proxy = st.text_input("Proxy URL prefix", value=proxy, placeholder="https://login.ezproxy.your-uni.edu/login?url=")
new_cookie = st.text_area("Proxy session cookie (optional)", value=cookie, height=70)

if st.button("Save institutional settings"):
    api.set_setting("institutional_proxy_prefix", new_proxy.strip() or None)
    api.set_setting("institutional_cookie", new_cookie.strip() or None)
    st.success("Saved.")

st.divider()
st.subheader("Backend API URL")
api_url = st.text_input("API URL", value=st.session_state.get("api_url", "http://localhost:8000"))
if st.button("Update API URL"):
    st.session_state["api_url"] = api_url
    st.success(f"Now using {api_url}")
