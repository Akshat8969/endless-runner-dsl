extends Control

# -------------------------
# UI REFERENCES
# -------------------------
@onready var name_input = $VBoxContainer/NameInput
@onready var error_text = $VBoxContainer/ErrorText
@onready var start_button = $VBoxContainer/StartButton
@onready var bg = $TextureRect


# -------------------------
# BACKGROUND MOTION SETTINGS
# -------------------------
var speed = 20.0
var direction = 1
var limit = 60   # adjust if needed


# -------------------------
# READY
# -------------------------
func _ready():
	# ensure clean input
	name_input.text = ""
	error_text.text = ""


# -------------------------
# BACKGROUND ANIMATION
# -------------------------
func _process(delta):
	bg.position.x += speed * direction * delta

	if bg.position.x > limit:
		direction = -1
	elif bg.position.x < -limit:
		direction = 1


# -------------------------
# START BUTTON LOGIC
# -------------------------
func _on_StartButton_pressed():
	var player_name = name_input.text.strip_edges()

	if player_name == "":
		error_text.text = "⚠ Enter your name!"
		name_input.grab_focus()
		return

	if player_name.length() < 4:
		error_text.text = "⚠ Name too short!(atleast enter 4 character name)"
		name_input.grab_focus()
		return

	# save data
	GameManager.player_name = player_name
	GameManager.coins = 0
	GameManager.status = "playing"

	# UI feedback
	start_button.disabled = true
	start_button.text = "Loading..."

	# ✅ STORE TREE FIRST (VERY IMPORTANT)
	var tree = get_tree()

	# wait
	await tree.create_timer(3.0).timeout

	# ✅ use stored reference
	tree.change_scene_to_file("res://main.tscn")
# -------------------------
# CLEAR ERROR ON TYPE
# -------------------------
func _on_NameInput_text_changed(new_text):
	error_text.text = ""
