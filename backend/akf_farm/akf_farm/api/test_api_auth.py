import frappe
from frappe.tests.utils import FrappeTestCase
from akf_farm.api import auth_api


class TestAuthApi(FrappeTestCase):
    def test_me_returns_admin_for_administrator(self):
        me = auth_api.me()
        self.assertEqual(me["email"], "Administrator")
        self.assertEqual(me["role"], "admin")
        self.assertIn("roles", me)
