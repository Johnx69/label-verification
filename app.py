from flask import Flask, jsonify, request, render_template, send_file
import json, os
from datetime import datetime
from io import BytesIO
import pandas as pd

app = Flask(__name__)
DATA_FILE = "dataset.json"


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        return []


def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/datapoints/count", methods=["GET"])
def get_count():
    data = load_data()
    return jsonify({"count": len(data)})


@app.route("/api/datapoints/<int:index>", methods=["GET"])
def get_datapoint(index):
    data = load_data()
    if 0 <= index < len(data):
        return jsonify({"index": index, "datapoint": data[index]})
    else:
        return jsonify({"error": "Index out of range"}), 404


@app.route("/api/datapoints/<int:index>", methods=["PUT"])
def update_datapoint(index):
    data = load_data()
    if 0 <= index < len(data):
        update_fields = request.json

        # If a verification update is provided, log the action
        if (
            "verified_response" in update_fields
            and "verifier" in update_fields
            and "verification_status" in update_fields
        ):
            data[index]["verified_response"] = update_fields["verified_response"]
            data[index]["verification_status"] = update_fields["verification_status"]
            data[index]["verifier"] = update_fields["verifier"]
            # Append to verification_log
            log_entry = {
                "verifier": update_fields["verifier"],
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "verification_status": update_fields["verification_status"],
            }
            if "verification_log" not in data[index]:
                data[index]["verification_log"] = []
            data[index]["verification_log"].append(log_entry)

        # Allow other updates (e.g., editing gpt_response if needed)
        for key, value in update_fields.items():
            data[index][key] = value

        save_data(data)
        return jsonify({"message": "Updated successfully", "datapoint": data[index]})
    else:
        return jsonify({"error": "Index out of range"}), 404


@app.route("/api/datapoints/<int:index>", methods=["DELETE"])
def delete_datapoint(index):
    data = load_data()
    if 0 <= index < len(data):
        removed = data.pop(index)
        save_data(data)
        return jsonify({"message": "Deleted successfully", "datapoint": removed})
    else:
        return jsonify({"error": "Index out of range"}), 404


@app.route("/export", methods=["GET"])
def export_excel():
    data = load_data()
    rows = []
    for dp in data:
        row = {
            "Image": dp.get("image", ""),
            "Question": dp.get("value", ""),
            "ChatGPT Answer": dp.get("gpt_response", ""),
            "Verified Answer": dp.get("verified_response", ""),
            "Verification Status": dp.get("verification_status", ""),
            "Verifier": dp.get("verifier", ""),
            "Verification Log": str(dp.get("verification_log", "")),
        }
        rows.append(row)
    df = pd.DataFrame(rows)
    output = BytesIO()
    writer = pd.ExcelWriter(output, engine="xlsxwriter")
    df.to_excel(writer, index=False)
    writer.save()
    output.seek(0)
    return send_file(
        output, attachment_filename="exported_results.xlsx", as_attachment=True
    )


if __name__ == "__main__":
    app.run(debug=True)
