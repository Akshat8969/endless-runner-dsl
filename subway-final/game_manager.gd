extends Node

var player_name = ""
var coins = 0
var status = "playing"

func end_game(win, score):
	coins = score
	status = "win" if win else "lose"

	# ✅ UNPAUSE BEFORE CHANGING SCENE
	get_tree().paused = false
	get_tree().change_scene_to_file("res://EndScreen.tscn")

# ✅ ADD THIS — Full reset function
func reset():
	player_name = ""
	coins = 0
	status = "playing"
	get_tree().paused = false
